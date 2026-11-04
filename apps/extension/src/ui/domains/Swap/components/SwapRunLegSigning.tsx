import { log } from "@common/log"
import { evmNativeTokenId, networkIdFromTokenId } from "@talismn/chaindata-provider"
import { getErrorMessage } from "@talismn/util"
import { queryOptions, skipToken, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { withPricing } from "@ui/domains/Ethereum/withPricing"
import type { TxSubmitButtonTransactionEth } from "@ui/domains/Sign/TxSubmitButton/types"
import { useAccountByAddress } from "@ui/state/accounts"
import { getToken$ } from "@ui/state/chaindata"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { firstValueFrom } from "rxjs"
import type { Hex, PublicClient } from "viem"

import type { ApprovalInfo, BuiltLeg, QuoteLeg } from "../swap-modules/common.swap-module"
import {
  type AllowanceStep,
  approveRequest,
  type MinedApproval,
} from "../swap-modules/erc20-approval"
import { prepareTransactionRequestWithGasCheck } from "../swap-modules/evm-gas-check"
import { getEvmPublicClient } from "../swap-modules/evm-network"
import { nextLegStep, type SwapRun } from "../swap-modules/swap-run"
import { swapModules } from "../swaps.api"
import { SwapTxSubmitButton } from "./SwapTxSubmitButton"
import type { RunLegSigning } from "./swapTxCards"

/**
 * What the user signs next for a leg: the leg itself, or first the allowance its spender needs.
 * The payload carries no fee: the screen prices it, at the priority the user picks.
 */
type LegSignRequest =
  | {
      signs: "leg"
      tx: TxSubmitButtonTransactionEth
      /** the leg as built on what the previous leg landed, not as quoted */
      built: Pick<QuoteLeg, "inputAmount" | "outputAmount" | "fees"> &
        Pick<BuiltLeg, "acceptedOutput">
    }
  | {
      signs: "approval"
      step: Exclude<AllowanceStep, "none">
      symbol: string
      tx: TxSubmitButtonTransactionEth
    }

const APPROVAL_WAIT_MS = 2 * 60_000

type MinedLegApproval = Pick<MinedApproval, "blockNumber" | "nonce">

type SignedStep = Exclude<AllowanceStep, "none"> | "leg"

type SignAttempt = { step: SignedStep; nonce: number }

const nextNonce = (count: number, mined: MinedLegApproval | undefined) =>
  mined ? Math.max(count, mined.nonce + 1) : count

const buildApprovalTransaction = async (
  client: PublicClient,
  leg: QuoteLeg,
  approval: NonNullable<ApprovalInfo>,
  step: Exclude<AllowanceStep, "none">,
  nonce: number
): Promise<LegSignRequest> => {
  const networkId = networkIdFromTokenId(leg.fromTokenId)
  const signer = leg.signer as Hex
  const { call, txInfo } = approveRequest(leg.fromTokenId, approval, step)
  const [token, { to, data, value, gas }] = await Promise.all([
    firstValueFrom(getToken$(leg.fromTokenId)),
    prepareTransactionRequestWithGasCheck(client, evmNativeTokenId(networkId), {
      chain: null,
      account: signer,
      ...call,
    }),
  ])
  return {
    signs: "approval",
    step,
    symbol: token?.symbol ?? "",
    tx: {
      platform: "ethereum",
      networkId,
      payload: { from: signer, to, data, value, gas, nonce },
      txInfo,
    },
  }
}

const buildLegSignRequest = async (
  run: SwapRun,
  index: number,
  mined: MinedLegApproval | undefined,
  failedAttempt: SignAttempt | undefined
): Promise<LegSignRequest> => {
  const leg = run.quote.legs[index]
  const module = swapModules.find((candidate) => candidate.protocol === leg.protocol)
  if (!module) throw new Error("This swap provider is unavailable")

  const networkId = networkIdFromTokenId(leg.fromTokenId)
  const signer = leg.signer as Hex
  const client = await getEvmPublicClient(networkId)
  const [step, count] = await Promise.all([
    nextLegStep({ run, index, module, client, allowanceAt: mined?.blockNumber }),
    api.ethGetTransactionsCount(signer, networkId),
  ])
  const signs: SignedStep = step.signs === "approval" ? step.allowance : "leg"
  const nonce = failedAttempt?.step === signs ? failedAttempt.nonce : nextNonce(count, mined)
  if (step.signs === "approval")
    return buildApprovalTransaction(client, leg, step.approval, step.allowance, nonce)

  const { built, input } = step
  if (built.transaction.platform !== "ethereum")
    throw new Error("Only an EVM leg is signed on screen")
  const { to, data, value, gas } = built.transaction.transaction
  return {
    signs: "leg",
    tx: {
      platform: "ethereum",
      networkId,
      payload: { from: signer, to, data, value, gas, nonce },
      txInfo: built.txInfo,
    },
    built: {
      inputAmount: input,
      outputAmount: built.expectedOutput,
      fees: built.fees,
      acceptedOutput: built.acceptedOutput,
    },
  }
}

const legSignQuery = (
  run: SwapRun,
  index: number | null,
  mined: MinedLegApproval | undefined,
  failedAttempt: SignAttempt | undefined
) =>
  queryOptions({
    queryKey: [
      "swap-run-leg",
      run.id,
      index,
      mined?.blockNumber.toString(),
      mined?.nonce,
      failedAttempt?.step,
      failedAttempt?.nonce,
    ],
    queryFn:
      index !== null ? () => buildLegSignRequest(run, index, mined, failedAttempt) : skipToken,
    staleTime: Infinity,
    refetchOnWindowFocus: "always",
    retry: false,
  })

const waitForApproval = async (tx: TxSubmitButtonTransactionEth, hash: Hex) => {
  try {
    const client = await getEvmPublicClient(tx.networkId)
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: APPROVAL_WAIT_MS })
    return receipt.blockNumber
  } catch (cause) {
    log.warn("Could not wait for the approval to mine", { cause, hash })
    return undefined
  }
}

const signedStep = (request: LegSignRequest): SignedStep =>
  request.signs === "approval" ? request.step : request.signs

const attemptOf = (request: LegSignRequest | undefined): SignAttempt | undefined => {
  const nonce = request?.tx.payload.nonce
  return request && nonce !== undefined ? { step: signedStep(request), nonce } : undefined
}

type LegNote<T> = { leg: number; value: T }

const noteFor = <T,>(note: LegNote<T> | undefined, leg: number | null) =>
  note && note.leg === leg ? note.value : undefined

/** an approval's gas limit or priority must not carry over to the approval or leg after it */
const useFreshPricingPer = (
  signed: string | undefined,
  { setCustomSettings, setPriority }: ReturnType<typeof useEthTransaction>
) => {
  const [pricedFor, setPricedFor] = useState(signed)
  if (signed && signed !== pricedFor) {
    setPricedFor(signed)
    setCustomSettings(undefined)
    setPriority(undefined)
  }
}

export const useLegSigning = (
  run: SwapRun,
  index: number | null,
  onLegSent: (index: number, hash: Hex, input: bigint) => void
) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [minedApproval, setMinedApproval] = useState<LegNote<MinedLegApproval>>()
  const [failedAttempt, setFailedAttempt] = useState<LegNote<SignAttempt>>()
  const legFailedAttempt = noteFor(failedAttempt, index)
  const request = useQuery(
    legSignQuery(run, index, noteFor(minedApproval, index), legFailedAttempt)
  )
  const ethTx = useEthTransaction(request.data?.tx.payload, request.data?.tx.networkId)
  useFreshPricingPer(request.data && `${index}:${signedStep(request.data)}`, ethTx)
  const [approvalHashes, setApprovalHashes] = useState<Readonly<Partial<Record<number, Hex>>>>({})
  const [signFailure, setSignFailure] = useState<LegNote<string>>()
  const [isApprovalPending, setIsApprovalPending] = useState(false)
  const [rejectedSubmissions, setRejectedSubmissions] = useState(0)
  const signer = useAccountByAddress(index === null ? undefined : run.quote.legs[index].signer)

  const tx: TxSubmitButtonTransactionEth | undefined =
    request.data && ethTx.transaction && !ethTx.error
      ? {
          ...request.data.tx,
          payload: { ...ethTx.transaction, nonce: request.data.tx.payload.nonce },
          txInfo: request.data.tx.txInfo && withPricing(request.data.tx.txInfo, ethTx),
        }
      : undefined

  const failure = request.error
    ? getErrorMessage(request.error, t("Failed to prepare the transaction"))
    : noteFor(signFailure, index)

  const approvalHash = index === null ? undefined : approvalHashes[index]
  const signs = request.data?.signs
  const signing = useMemo<RunLegSigning | null>(
    () => (index === null ? null : { leg: index, signs, approvalHash, isApprovalPending, failure }),
    [approvalHash, failure, index, isApprovalPending, signs]
  )

  const clearFailure = () => setSignFailure(undefined)
  const rebuild = () => request.refetch()

  const onSubmit = async (hash: string) => {
    clearFailure()
    if (!request.data || index === null) return
    if (request.data.signs === "leg")
      return onLegSent(index, hash as Hex, request.data.built.inputAmount)

    const { tx } = request.data
    setApprovalHashes((hashes) => ({ ...hashes, [index]: hash as Hex }))
    setIsApprovalPending(true)
    const blockNumber = await waitForApproval(tx, hash as Hex)
    if (blockNumber !== undefined && tx.payload.nonce !== undefined) {
      const mined = { blockNumber, nonce: tx.payload.nonce }
      await queryClient.prefetchQuery(legSignQuery(run, index, mined, legFailedAttempt))
      setMinedApproval({ leg: index, value: mined })
    } else await rebuild()
    setIsApprovalPending(false)
  }

  const attempt = attemptOf(request.data)
  const onError = (cause: unknown) => {
    setRejectedSubmissions((count) => count + 1)
    if (index !== null) {
      setSignFailure({ leg: index, value: getErrorMessage(cause, t("Failed to submit")) })
      if (attempt) setFailedAttempt({ leg: index, value: attempt })
    }
    rebuild()
  }

  const onPayloadLockChange = (isLocked: boolean) => {
    if (isLocked) clearFailure()
    else rebuild()
  }

  return {
    signing,
    approvalHashes,
    ethTx: request.data ? ethTx : undefined,
    built: request.data?.signs === "leg" ? request.data.built : undefined,
    feeTokenId: request.data ? evmNativeTokenId(request.data.tx.networkId) : undefined,
    blockingError: ethTx.error,
    button: {
      request: request.data,
      tx,
      isLedger: !!signer?.type.startsWith("ledger-"),
      isBuildFailed: request.isError,
      isRetry: !!failure,
      isApprovalPending,
      rejectedSubmissions,
      rebuild,
      onSubmit,
      onError,
      onPayloadLockChange,
    },
  }
}

export type LegSigningState = ReturnType<typeof useLegSigning>

export const LegSignButton: FC<{
  button: LegSigningState["button"]
  containerId?: string
}> = ({ button, containerId }) => {
  const { t } = useTranslation()
  const { request, tx } = button

  if (button.isBuildFailed)
    return (
      <Button color="orange" fullWidth onClick={button.rebuild}>
        {t("Try again")}
      </Button>
    )

  if (!request)
    return (
      <Button primary fullWidth processing>
        {t("Processing")}
      </Button>
    )

  const label =
    request.signs === "approval"
      ? request.step === "revoke"
        ? t("Revoke Approval")
        : t("Approve {{symbol}}", { symbol: request.symbol })
      : button.isLedger
        ? t("Sign on Ledger")
        : t("Sign")

  return (
    <SwapTxSubmitButton
      key={button.rejectedSubmissions}
      containerId={containerId}
      tx={tx}
      label={label}
      isRetry={button.isRetry}
      isFinalStep={request.signs !== "approval"}
      isProcessing={button.isApprovalPending}
      onSubmit={button.onSubmit}
      onError={button.onError}
      onPayloadLockChange={button.onPayloadLockChange}
      disabled={!tx}
    />
  )
}
