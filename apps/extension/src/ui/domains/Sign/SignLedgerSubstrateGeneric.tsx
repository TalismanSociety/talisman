import {
  AccountJsonHardwareSubstrate,
  SignerPayloadJSON,
  SignerPayloadRaw,
  isJsonPayload,
} from "@extension/core"
import { log } from "@extension/shared"
import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
import { TypeRegistry } from "@polkadot/types"
import { HexString } from "@polkadot/util/types"
import { classNames } from "@talismn/util"
import { LedgerError, getLedgerSubstrateAccountIds } from "@ui/hooks/ledger/common"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
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

const registry = new TypeRegistry()

function isRawPayload(payload: SignerPayloadJSON | SignerPayloadRaw): payload is SignerPayloadRaw {
  return !!(payload as SignerPayloadRaw).data
}

const addCheckMetadata = (payload: SignerPayloadJSON): SignerPayloadJSON => ({
  ...payload,
  signedExtensions: payload.signedExtensions.concat(["CheckMetadata"]),
})

const SignLedgerSubstrateGeneric: FC<SignHardwareSubstrateProps> = ({
  className = "",
  onSigned,
  onSentToDevice,
  onCancel,
  payload,
  containerId,
}) => {
  // TODO remove, this is just for testing
  if (payload && isJsonPayload(payload)) payload = addCheckMetadata(payload)

  const account = useAccountByAddress(payload?.address)
  const { t } = useTranslation("request")
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unsigned, setUnsigned] = useState<Uint8Array>()
  const [isRaw, setIsRaw] = useState<boolean>()
  const { ledger, refresh, status, message, isReady, requiresManualRetry } =
    useLedgerSubstrateGeneric()

  const connectionStatus: LedgerConnectionStatusProps = useMemo(
    () => ({
      status: status === "ready" ? "connecting" : status,
      message: status === "ready" ? t("Please approve from your Ledger.") : message,
      refresh,
      requiresManualRetry,
    }),
    [refresh, status, message, requiresManualRetry, t]
  )

  useEffect(() => {
    if (!payload) return

    if (isRawPayload(payload)) {
      setUnsigned(wrapBytes(payload.data))
      setIsRaw(true)
      return
    }

    if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
    const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
      version: payload.version,
    })
    setUnsigned(extrinsicPayload.toU8a(true))
    setIsRaw(false)
  }, [payload, t])

  const onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  // const genesisHash = useMemo(
  //   () => (payload && isJsonPayload(payload) && payload.genesisHash) || undefined,
  //   [payload]
  // )

  const {
    data: metadata,
    error: errorMetadata,
    //isLoading: isLoadingMetadata,
  } = useShortenedMetadata(payload && isJsonPayload(payload) ? payload : null)

  const signLedger = useCallback(async () => {
    if (!ledger || !unsigned || !onSigned || !account) return

    setError(null)

    // if JSON payload, metadata is required to continue
    if (!isRaw && !metadata) {
      if (errorMetadata) setError((errorMetadata as Error).message)
      return
    }

    try {
      const { accountIndex, change, addressIndex } = getLedgerSubstrateAccountIds(
        account as AccountJsonHardwareSubstrate
      )
      // if (typeof account.accountIndex !== "number" || typeof account.addressOffset !== "number")
      //   throw new Error("Invalid account")

      // const HARDENED = 0x80000000
      // const accountIdx = HARDENED + account.accountIndex
      // const change = HARDENED
      // const addressIndex = HARDENED + account.addressOffset

      // console.log(" sending to ledger", {
      //   unsigned,
      //   metadata,
      //   isRaw,
      //   accountIndex,
      //   change,
      //   addressIndex,
      //   account,
      // })
      const response = await (isRaw
        ? ledger.signRaw(accountIndex, change, addressIndex, Buffer.from(unsigned))
        : ledger.signImpl(
            accountIndex,
            change,
            addressIndex,
            2,
            Buffer.from(unsigned),
            Buffer.from(metadata!)
          ))

      if (response.error_message !== "No errors")
        throw new LedgerError(response.error_message, "LedgerError", response.return_code)

      // await to keep loader spinning until popup closes
      await onSigned({ signature: response.signature.toString("hex") as HexString })
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
  }, [ledger, unsigned, onSigned, account, isRaw, metadata, errorMetadata, t])

  useEffect(() => {
    if (isReady && !error && unsigned && !isSigning) {
      setIsSigning(true)
      onSentToDevice?.(true)
      signLedger().finally(() => {
        setIsSigning(false)
        onSentToDevice?.(false)
      })
    }
  }, [signLedger, isSigning, error, isReady, onSentToDevice, unsigned])

  const handleCloseDrawer = useCallback(() => setError(null), [setError])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      {!error && (
        <LedgerConnectionStatus
          {...{ ...connectionStatus }}
          refresh={onRefresh}
          hideOnSuccess={true}
        />
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
