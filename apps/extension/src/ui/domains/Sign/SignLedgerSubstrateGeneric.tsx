import {
  AccountJsonHardwareSubstrate,
  SignerPayloadJSON,
  SignerPayloadRaw,
  isJsonPayload,
} from "@extension/core"
import { log } from "@extension/shared"
import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
import { TypeRegistry } from "@polkadot/types"
import { hexToU8a } from "@polkadot/util"
import { classNames } from "@talismn/util"
import { LedgerError, getLedgerSubstrateAccountIds } from "@ui/hooks/ledger/common"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"
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
import { useShortenedMetadata } from "./useShortenedMetadata"

// const addCheckMetadata = (payload: SignerPayloadJSON): SignerPayloadJSON => ({
//   ...payload,
//   signedExtensions: payload.signedExtensions.concat(["CheckMetadata"]),
// })

const sign = (
  ledger: PolkadotGenericApp,
  payload: SignerPayloadJSON | SignerPayloadRaw,
  account: AccountJsonHardwareSubstrate,
  metadata?: string | null
) => {
  const { accountIndex, change, addressIndex } = getLedgerSubstrateAccountIds(
    account as AccountJsonHardwareSubstrate
  )

  if (isJsonPayload(payload)) {
    if (!metadata) throw new Error("Missing metadata")

    // if (!payload.signedExtensions.includes("CheckMetadataHash"))
    //   payload.signedExtensions.push("CheckMetadataHash")
    //throw new Error("Missing signed extension: CheckMetadataHash")

    const registry = new TypeRegistry()
    registry.setSignedExtensions(payload.signedExtensions)
    const unsigned = registry.createType("ExtrinsicPayload", payload, {
      version: payload.version,
    })

    return ledger.signImpl(
      accountIndex,
      change,
      addressIndex,
      2,
      Buffer.from(unsigned.toU8a(true)),
      Buffer.from(hexToU8a(metadata))
    )
  }

  // raw payload
  const unsigned = wrapBytes(payload.data)
  return ledger.signRaw(accountIndex, change, addressIndex, Buffer.from(unsigned))

  //   const registry = new TypeRegistry()
  //   const unsigned = isJsonPayload(payload) ? registry.createType("ExtrinsicPayload", payload, {
  //   version: payload.version,
  // }) : wrapBytes(payload.data)

  //   const response = await (isRaw
  //     ? ledger.signRaw(accountIndex, change, addressIndex, Buffer.from(unsigned))
  //     : ledger.signImpl(
  //         accountIndex,
  //         change,
  //         addressIndex,
  //         2,
  //         Buffer.from(unsigned),
  //         Buffer.from(metadata!))
}

const SignLedgerSubstrateGeneric: FC<SignHardwareSubstrateProps> = ({
  className = "",
  onSigned,
  onSentToDevice,
  onCancel,
  payload,
  containerId,
}) => {
  // TODO remove, this is just for testing
  //if (payload && isJsonPayload(payload)) payload = addCheckMetadata(payload)

  const account = useAccountByAddress(payload?.address)
  const { t } = useTranslation("request")
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // const [unsigned, setUnsigned] = useState<Uint8Array>()
  // const [isRaw, setIsRaw] = useState<boolean>()
  const { ledger, refresh, status, message, isReady, requiresManualRetry } =
    useLedgerSubstrateGeneric()

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

  // useEffect(() => {
  //   if (!payload) return

  //   console.log("useEffect payload")

  //   if (isRawPayload(payload)) {
  //     setUnsigned(wrapBytes(payload.data))
  //     setIsRaw(true)
  //     return
  //   }

  //   if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
  //   const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
  //     version: payload.version,
  //   })
  //   setUnsigned(extrinsicPayload.toU8a(true))
  //   setIsRaw(false)
  // }, [payload, t])

  const {
    data: metadata,
    error: errorMetadata,
    isLoading: isLoadingMetadata,
  } = useShortenedMetadata(payload && isJsonPayload(payload) ? payload : null)

  useEffect(() => {
    if (errorMetadata)
      setError(errorMetadata instanceof Error ? errorMetadata.message : errorMetadata.toString())
  }, [errorMetadata])

  const inputsReady = useMemo(() => {
    return !!account && !!payload && (!isJsonPayload(payload) || !!metadata)
  }, [account, metadata, payload])

  const signLedger = useCallback(async () => {
    if (!ledger || !payload || !onSigned || !account || !inputsReady) return

    if (isJsonPayload(payload) && !metadata) {
      if (errorMetadata) return setError((errorMetadata as Error).message)
      if (!isLoadingMetadata) return setError("Metadata unavailable") // shouldn't happen, useShortenedMetadata throws if no metadata
      return setError(null) // wait for metadata
    }

    setError(null)

    try {
      const response = await sign(
        ledger,
        payload,
        account as AccountJsonHardwareSubstrate,
        metadata
      )

      if (response.error_message !== "No errors")
        throw new LedgerError(response.error_message, "LedgerError", response.return_code)

      // await to keep loader spinning until popup closes
      await onSigned({
        signature: `0x${response.signature.toString("hex")}`,
      })
    } catch (error) {
      log.error("signLedger", { error })
      const message = (error as Error)?.message
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
    metadata,
    errorMetadata,
    isLoadingMetadata,
    t,
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
