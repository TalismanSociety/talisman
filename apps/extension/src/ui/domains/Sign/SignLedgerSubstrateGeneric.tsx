import {
  AccountJsonHardwareSubstrate,
  SignerPayloadJSON,
  SignerPayloadRaw,
  isJsonPayload,
} from "@extension/core"
import { log } from "@extension/shared"
import { TypeRegistry } from "@polkadot/types"
import { u8aToHex, u8aWrapBytes } from "@polkadot/util"
import { classNames } from "@talismn/util"
import { getPolkadotLedgerDerivationPath } from "@ui/hooks/ledger/common"
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

type RawLedgerError = {
  errorMessage: string
  name?: string
  returnCode: number
}

// TODO remove async
const sign = async (
  ledger: PolkadotGenericApp,
  payload: SignerPayloadJSON | SignerPayloadRaw,
  account: AccountJsonHardwareSubstrate,
  metadata?: string | null
) => {
  // const { accountIndex, change, addressIndex } = getLedgerSubstrateAccountIds(
  //   account as AccountJsonHardwareSubstrate
  // )

  const path = getPolkadotLedgerDerivationPath(account)

  // console.log("path", path)

  if (isJsonPayload(payload)) {
    if (!metadata) throw new Error("Missing metadata")

    const registry = new TypeRegistry()
    registry.setSignedExtensions(payload.signedExtensions)
    const unsigned = registry.createType("ExtrinsicPayload", payload, {
      version: payload.version,
    })

    const buffMetadata = await ledger.getTxMetadata(
      Buffer.from(unsigned.toU8a(true))
      // "roc",
      // "https://api.zondax.ch/polkadot/transaction/metadata"
    )

    // console.log({ path })

    // try {
    //   const hexMetadata = u8aToHex(
    //     await ledger.getTxMetadata(
    //       Buffer.from(unsigned.toU8a(true))
    //       // "roc",
    //       // "https://api.zondax.ch/polkadot/transaction/metadata"
    //     ),
    //     undefined,
    //     false
    //   )

    //   console.log("metada check", metadata === hexMetadata, { metadata, hexMetadata })
    // } catch (err) {
    //   console.error("Failed to fetch metadata from zondax", { err })
    // }

    // return ledger.signImpl(
    //   accountIndex,
    //   change,
    //   addressIndex,
    //   2,
    //   Buffer.from(unsigned.toU8a(true)),
    //   Buffer.from(hexToU8a(metadata))
    // )
    return ledger.signWithMetadata(
      path,
      Buffer.from(unsigned.toU8a(true)),
      buffMetadata
      //Buffer.from(hexToU8a(metadata))
    )
  } else {
    // raw payload
    const unsigned = u8aWrapBytes(payload.data)

    return ledger.signRaw(path, Buffer.from(unsigned))

    // const hex1 = bufferToHex(signature) // signature.toString("hex")
    // const hex2 = signature.toString("hex")
    // const hex3 = u8aToHex(hexToU8a(hex1).slice(1), undefined, true)
    // // console.log("hex1", hex1)
    // // console.log("hex2", hex2)
    // // console.log("hex3", hex2)
    // const verify1 = signatureVerify(payload.data, hex1, account.address)
    // //console.log("1", JSON.stringify(verify1, null, 2))
    // // const verify2 = signatureVerify(payload.data, hex2, account.address)
    // // console.log({ verify2 })
    // const verify3 = signatureVerify(payload.data, hex3, account.address)
    // //console.log("3", JSON.stringify(verify3, null, 2))

    // // console.log({
    // //   hex1,
    // //   hex2,
    // //   hex3,
    // //   verify1: JSON.stringify(verify1, null, 2),
    // //   //verify2,
    // //   verify3: JSON.stringify(verify3, null, 2),
    // //   address: account.address,
    // //   data: payload.data,
    // // })

    // // alert("hey")

    // // const hexMinusType = u8aToHex(hexToU8a(hex1).slice(1))
    // // console.log({ hex: hex1, hexMinusType })

    // // alert(JSON.stringify(signatureVerify(payload.data, hexMinusType, account.address), null, 2))

    // return { signature: hex3 }
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
  const { t } = useTranslation("request")
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

      // if (response.error_message !== "No errors")
      //   throw new LedgerError(response.error_message, "LedgerError", response.return_code)

      // await to keep loader spinning until popup closes
      await onSigned({
        signature: isJsonPayload(payload)
          ? u8aToHex(response.signature)
          : u8aToHex(response.signature.slice(1)), // remove first byte (type) or signatureVerify will fail
      })
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
