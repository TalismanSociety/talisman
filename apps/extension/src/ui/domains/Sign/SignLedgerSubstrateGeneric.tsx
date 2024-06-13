import {
  AccountJsonHardwareSubstrate,
  SignerPayloadJSON,
  SignerPayloadRaw,
  isJsonPayload,
} from "@extension/core"
import { log } from "@extension/shared"
import { TypeRegistry } from "@polkadot/types"
import { hexToU8a, u8aToHex, u8aWrapBytes } from "@polkadot/util"
import { classNames } from "@talismn/util"
import { getPolkadotLedgerDerivationPath } from "@ui/hooks/ledger/common"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"
import {
  SubstrateMigrationApp,
  useLedgerSubstrateMigrationApp,
} from "@ui/hooks/ledger/useLedgerSubstrateMigrationApps"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { PolkadotGenericApp } from "@zondax/ledger-substrate"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer } from "talisman-ui"
import { Button } from "talisman-ui"

import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "../Account/LedgerConnectionStatus"
import { LedgerSigningStatus } from "./LedgerSigningStatus"
import { SignHardwareSubstrateProps } from "./SignHardwareSubstrate"
import { useLedgerPolkadotPayload } from "./useLedgerPolkadotPayload"

type RawLedgerError = {
  errorMessage: string
  name?: string
  returnCode: number
}

const sign = async (
  ledger: PolkadotGenericApp,
  payload: SignerPayloadJSON | SignerPayloadRaw,
  account: AccountJsonHardwareSubstrate,
  app?: SubstrateMigrationApp | null,
  registry?: TypeRegistry | null,
  txMetadata?: string | null
) => {
  const path = getPolkadotLedgerDerivationPath({ ...account, app })

  if (isJsonPayload(payload)) {
    if (!txMetadata) throw new Error("Missing metadata")
    if (!registry) throw new Error("Missing registry")

    const unsigned = registry.createType("ExtrinsicPayload", payload)

    const blob = Buffer.from(unsigned.toU8a(true))
    const metadata = Buffer.from(hexToU8a(txMetadata))

    const { signature } = await ledger.signWithMetadata(path, blob, metadata)
    return u8aToHex(signature)
  } else {
    // raw payload
    const unsigned = u8aWrapBytes(payload.data)

    const { signature } = await ledger.signRaw(path, Buffer.from(unsigned))

    // skip first byte (sig type) or signatureVerify fails, this seems specific to ed25519 signatures
    return u8aToHex(signature.slice(1))
  }
}

const SignLedgerSubstrateGeneric: FC<SignHardwareSubstrateProps> = ({
  className = "",
  onSigned,
  onSentToDevice,
  onCancel,
  payload,
  containerId,
}) => {
  const account = useAccountByAddress(payload?.address)
  const app = useLedgerSubstrateMigrationApp(account?.migrationAppName as string)

  const { t } = useTranslation("request")
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { ledger, refresh, status, message, isReady, requiresManualRetry } =
    useLedgerSubstrateGeneric({ app })

  // reset
  useEffect(() => {
    setIsSigned(false)
  }, [payload])

  const connectionStatus: LedgerConnectionStatusProps = useMemo(
    () => ({
      status: status === "ready" ? "connecting" : status,
      message: status === "ready" ? t("Please approve from your Ledger.") : message,
      refresh,
      requiresManualRetry,
    }),
    [refresh, status, message, requiresManualRetry, t]
  )

  const {
    data: metadata,
    error: errorMetadata,
    isLoading: isLoadingMetadata,
  } = useLedgerPolkadotPayload(payload && isJsonPayload(payload) ? payload : null)

  const { metadataHash, txMetadata, registry, payloadWithMetadataHash, hasCheckMetadataHash } =
    useMemo(
      () =>
        metadata ?? {
          txMetadata: undefined,
          metadataHash: undefined,
          registry: undefined,
          payloadWithMetadataHash: undefined,
          hasCheckMetadataHash: undefined,
        },
      [metadata]
    )

  useEffect(() => {
    if (errorMetadata)
      setError(errorMetadata instanceof Error ? errorMetadata.message : errorMetadata.toString())
  }, [errorMetadata])

  const inputsReady = useMemo(() => {
    return !!account && !!payload && (!isJsonPayload(payload) || !!metadata)
  }, [account, metadata, payload])

  const signLedger = useCallback(async () => {
    if (!ledger || !payload || !onSigned || !account || !inputsReady) return

    if (
      isJsonPayload(payload) &&
      (!txMetadata ||
        !metadataHash ||
        !registry ||
        !payloadWithMetadataHash ||
        !hasCheckMetadataHash)
    ) {
      if (!hasCheckMetadataHash)
        return setError(
          t("This network doesn't support signatures from Ledger Polkadot Generic App.")
        )
      if (errorMetadata) return setError((errorMetadata as Error).message)
      if (!isLoadingMetadata) return setError(t("Metadata unavailable")) // shouldn't happen, useShortenedMetadata throws if no metadata
      return setError(null) // wait for metadata
    }

    setError(null)

    try {
      if (!payloadWithMetadataHash) throw new Error("Missing payloadWithMetadataHash") // just to please typescript

      const signature = await sign(
        ledger,
        payloadWithMetadataHash ?? payload,
        account as AccountJsonHardwareSubstrate,
        app,
        registry,
        txMetadata
      )

      // await to keep loader spinning until popup closes
      await onSigned({ signature, payload: payloadWithMetadataHash })
    } catch (error) {
      log.error("signLedger", { error })
      const message = (error as Error)?.message ?? (error as RawLedgerError)?.errorMessage
      switch (message) {
        case "Transaction rejected":
          return

        case "Instruction not supported":
          return setError(
            t(
              "This instruction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again."
            )
          )

        default:
          log.error("ledger sign Substrate : " + message, { error })
          setError(message)
      }
    }
  }, [
    ledger,
    payload,
    onSigned,
    account,
    inputsReady,
    txMetadata,
    metadataHash,
    registry,
    payloadWithMetadataHash,
    hasCheckMetadataHash,
    t,
    errorMetadata,
    isLoadingMetadata,
    app,
  ])

  const onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  const handleSendClick = useCallback(() => {
    setIsSigning(true)
    onSentToDevice?.(true)
    signLedger()
      .catch(() => onSentToDevice?.(false))
      .finally(() => setIsSigning(false))
  }, [onSentToDevice, signLedger])

  const handleCloseDrawer = useCallback(() => setError(null), [setError])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      {!error && (
        <>
          {isReady ? (
            <Button
              className="w-full"
              disabled={!inputsReady}
              primary
              processing={isSigning}
              onClick={handleSendClick}
            >
              {t("Approve on Ledger")}
            </Button>
          ) : (
            !isSigned && <LedgerConnectionStatus {...{ ...connectionStatus }} refresh={onRefresh} />
          )}
        </>
      )}
      {onCancel && (
        <Button className="w-full" onClick={onCancel}>
          {t("Cancel")}
        </Button>
      )}
      {error && (
        <Drawer anchor="bottom" isOpen={true} containerId={containerId}>
          <LedgerSigningStatus
            message={error ? error : ""}
            status={error ? "error" : isSigning ? "signing" : undefined}
            confirm={handleCloseDrawer}
          />
        </Drawer>
      )}
    </div>
  )
}

// default export to allow for lazy loading
export default SignLedgerSubstrateGeneric
