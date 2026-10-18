import { log } from "@common/log"
import type { AccountLedgerPolkadot } from "@core/domains/keyring/exports"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { getMevShieldInnerPayload } from "@core/domains/substrate/helpers"
import type {
  MevShieldRequestSubmit,
  MevShieldResponsePrepare,
} from "@core/domains/substrate/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import type { ScaleApi } from "@talismn/sapi"
import { toHex } from "@talismn/scale"
import { getErrorMessage } from "@talismn/util"
import { api } from "@ui/api"
import { track } from "@ui/api/track"
import { notify } from "@ui/components/Notifications"
import { getTalismanLedgerError, TalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerPolkadot } from "@ui/hooks/ledger/useLedgerPolkadot"
import { useLedgerSubstrateAppByName } from "@ui/hooks/ledger/useLedgerSubstrateApp"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useUnmount } from "react-use"
import type { Hex } from "viem"
import {
  initialLedgerMevShieldState,
  type LedgerMevShieldEvent,
  type LedgerMevShieldStage,
  ledgerMevShieldReducer,
  type SignedInner,
} from "./ledgerMevShieldReducer"

const MIN_SIGNING_MS = 8_000
const MAX_HEADS_TO_OPEN_WINDOW = 3

type UseLedgerMevShieldProps = {
  payload: SignerPayloadJSON
  txInfo?: WalletTransactionInfo
  account: AccountLedgerPolkadot
  sapi: ScaleApi
  onSubmitted: (hash: Hex, innerHash: Hex) => void
  onError?: (cause: unknown) => void
}

const trackMissedWindow = (before: LedgerMevShieldStage, after: LedgerMevShieldStage) => {
  if (after.kind !== "missed" || after.reason !== "timeout" || after === before) return
  if (before.kind === "signingOuter")
    track("mev_shield_window_missed", { closed_during: "signing" })
  if (before.kind === "submitting")
    track("mev_shield_window_missed", { closed_during: "broadcast" })
}

const useReducerWithSyncDispatch = () => {
  const stateRef = useRef(initialLedgerMevShieldState)
  const [state, setState] = useState(initialLedgerMevShieldState)

  const dispatch = useCallback((event: LedgerMevShieldEvent) => {
    const before = stateRef.current
    stateRef.current = ledgerMevShieldReducer(before, event)
    setState(stateRef.current)
    trackMissedWindow(before.stage, stateRef.current.stage)
    return stateRef.current
  }, [])

  const isCurrent = useCallback((attempt: number) => stateRef.current.attempt === attempt, [])

  return [state, dispatch, isCurrent] as const
}

const proofOf = (sapi: ScaleApi, payload: SignerPayloadJSON) => {
  const { payload: hashed, txMetadata } = sapi.getPayloadWithMetadataHash(payload)
  if (hashed.mode !== payload.mode || hashed.metadataHash !== payload.metadataHash)
    throw new Error("The metadata proof does not match the payload to sign")
  return txMetadata ? toHex(txMetadata) : null
}

const prepareSigningWindow = async (
  { payload, innerSignature }: SignedInner,
  isCurrent: () => boolean
): Promise<MevShieldResponsePrepare | { status: "late" } | null> => {
  for (let heads = 0; heads < MAX_HEADS_TO_OPEN_WINDOW; heads++) {
    const prepared = await api.subPrepareMevShield({ payload, innerSignature })
    if (!isCurrent()) return null
    const isTooLateToSign =
      prepared.status === "ready" && prepared.shieldWindow.deadline - Date.now() < MIN_SIGNING_MS
    if (!isTooLateToSign) return prepared
  }
  return { status: "late" }
}

export const useLedgerMevShield = ({
  payload,
  txInfo,
  account,
  sapi,
  onSubmitted,
  onError,
}: UseLedgerMevShieldProps) => {
  const { t } = useTranslation()
  const legacyApp = useLedgerSubstrateAppByName(account.app)
  const { sign } = useLedgerPolkadot({ legacyApp })
  const [state, dispatch, isCurrent] = useReducerWithSyncDispatch()

  const getUnavailableError = useCallback(
    () =>
      new TalismanLedgerError(
        "Custom",
        t("MEV Shield is unavailable right now. Turn it off to continue without it.")
      ),
    [t]
  )

  const signOnDevice = useCallback(
    async (attempt: number, signerPayload: SignerPayloadJSON, proof: string | null) => {
      if (!isCurrent(attempt)) return null
      dispatch({ type: "deviceBusy", busy: true })
      try {
        return await sign(signerPayload, account, proof)
      } finally {
        dispatch({ type: "deviceBusy", busy: false })
      }
    },
    [account, dispatch, isCurrent, sign]
  )

  const submit = useCallback(
    async (attempt: number, request: MevShieldRequestSubmit) => {
      const result = await api.subSubmitMevShield(request).catch((err: unknown) => {
        log.error("Failed to submit", { payload: request.payload, err })
        notify({
          type: "error",
          title: t("Failed to submit"),
          subtitle: getErrorMessage(err, t("Unknown error")).slice(0, 200),
          cause: err,
        })
        dispatch({ type: "failed", attempt, retryable: true, error: getTalismanLedgerError(err) })
        onError?.(err)
        return null
      })
      if (!result) return
      if (result.status === "missed") {
        dispatch({ type: "broadcastMissed", attempt })
        return
      }
      dispatch({ type: "submitted", attempt })
      onSubmitted(result.hash, result.innerHash)
    },
    [dispatch, onError, onSubmitted, t]
  )

  const runWindow = useCallback(
    async (attempt: number, signed: SignedInner) => {
      try {
        const prepared = await prepareSigningWindow(signed, () => isCurrent(attempt))
        if (!prepared) return
        if (prepared.status === "unavailable") {
          dispatch({ type: "failed", attempt, retryable: true, error: getUnavailableError() })
          return
        }
        if (prepared.status === "late") {
          const error = new TalismanLedgerError(
            "Custom",
            t("MEV Shield couldn't open a signing window in time. Please try again.")
          )
          dispatch({ type: "failed", attempt, retryable: true, error })
          return
        }
        if (prepared.status === "expired") {
          const error = new TalismanLedgerError(
            "Custom",
            t("Transaction expired. Please try again.")
          )
          dispatch({ type: "failed", attempt, retryable: false, error })
          return
        }

        const { outerPayload, shieldWindow } = prepared
        const proof = proofOf(sapi, outerPayload)
        const opened = dispatch({ type: "windowOpened", attempt, shieldWindow })
        if (opened.stage.kind !== "signingOuter") return

        const outerSignature = await signOnDevice(attempt, outerPayload, proof)
        if (!outerSignature) return
        const outerSigned = dispatch({ type: "outerSigned", attempt, at: Date.now() })
        if (outerSigned.stage.kind !== "submitting") return

        const { payload, innerSignature } = signed
        await submit(attempt, {
          payload,
          innerSignature,
          outerPayload,
          outerSignature,
          shieldWindow,
          txInfo,
        })
      } catch (err) {
        dispatch({ type: "failed", attempt, retryable: true, error: getTalismanLedgerError(err) })
      }
    },
    [dispatch, getUnavailableError, isCurrent, sapi, signOnDevice, submit, t, txInfo]
  )

  const start = useCallback(async () => {
    const started = dispatch({ type: "start" })
    if (started.stage.kind !== "signingInner") return
    const { attempt } = started

    try {
      const nextKey = await sapi.getStorage<unknown>("MevShield", "NextKey", [])
      if (!nextKey) {
        dispatch({ type: "failed", attempt, retryable: false, error: getUnavailableError() })
        return
      }

      const innerPayload = getMevShieldInnerPayload(payload)
      const innerSignature = await signOnDevice(attempt, innerPayload, proofOf(sapi, innerPayload))
      if (!innerSignature) return
      const signed = { payload, innerSignature }
      const innerSigned = dispatch({ type: "innerSigned", attempt, signed })
      if (innerSigned.stage.kind !== "awaitingBlock") return

      await runWindow(attempt, signed)
    } catch (err) {
      dispatch({ type: "failed", attempt, retryable: false, error: getTalismanLedgerError(err) })
    }
  }, [dispatch, getUnavailableError, payload, runWindow, sapi, signOnDevice])

  const retry = useCallback(() => {
    const retried = dispatch({ type: "retry" })
    if (retried.stage.kind === "awaitingBlock") runWindow(retried.attempt, retried.stage.signed)
  }, [dispatch, runWindow])

  const reset = useCallback(() => {
    dispatch({ type: "reset" })
  }, [dispatch])
  const dismissError = useCallback(() => {
    dispatch({ type: "errorDismissed" })
  }, [dispatch])

  const { stage, attempt } = state
  const deadline = stage.kind === "signingOuter" ? stage.shieldWindow.deadline : null
  useEffect(() => {
    if (deadline === null) return
    const timeout = setTimeout(
      () => dispatch({ type: "deadlinePassed", attempt }),
      deadline - Date.now()
    )
    return () => clearTimeout(timeout)
  }, [attempt, deadline, dispatch])

  useUnmount(reset)

  return { state, start, retry, reset, dismissError }
}
