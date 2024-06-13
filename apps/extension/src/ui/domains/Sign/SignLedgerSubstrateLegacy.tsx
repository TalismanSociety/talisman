import { SignerPayloadJSON, SignerPayloadRaw } from "@extension/core"
import { log } from "@extension/shared"
import { TypeRegistry } from "@polkadot/types"
import { hexToU8a, u8aToHex, u8aWrapBytes } from "@polkadot/util"
import { classNames } from "@talismn/util"
import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"
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

const registry = new TypeRegistry()

function isRawPayload(payload: SignerPayloadJSON | SignerPayloadRaw): payload is SignerPayloadRaw {
  return !!(payload as SignerPayloadRaw).data
}

const SignLedgerSubstrateLegacy: FC<SignHardwareSubstrateProps> = ({
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
  const [error, setError] = useState<string | null>(null)
  const [unsigned, setUnsigned] = useState<Uint8Array>()
  const [isRaw, setIsRaw] = useState<boolean>()
  const { ledger, refresh, status, message, isReady, requiresManualRetry } =
    useLedgerSubstrateLegacy(account?.genesisHash)

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
      const tmpUnsigned = u8aWrapBytes(payload.data)
      if (tmpUnsigned.length > 256) setError(t("The message is too long to be signed with Ledger."))

      setUnsigned(tmpUnsigned)
      setIsRaw(true)
    } else {
      if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
      const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
        version: payload.version,
      })
      setUnsigned(extrinsicPayload.toU8a(true))
      setIsRaw(false)
    }
  }, [payload, t])

  const onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  const signLedger = useCallback(async () => {
    if (!ledger || !unsigned || !onSigned || !account) return

    if (isRaw && unsigned.length > 256)
      return setError(t("The message is too long to be signed with Ledger."))

    setError(null)

    try {
      let { signature } = await (isRaw
        ? ledger.signRaw(unsigned, account.accountIndex, account.addressOffset)
        : ledger.sign(unsigned, account.accountIndex, account.addressOffset))

      if (isRaw)
        // remove first byte which stores the signature type (0 here, as 0 = ed25519)
        signature = u8aToHex(hexToU8a(signature).slice(1))

      // await to keep loader spinning until popup closes
      await onSigned({ signature })
    } catch (error) {
      const message = (error as Error)?.message
      switch (message) {
        case "Transaction rejected":
          return

        case "Txn version not supported":
          return setError(
            t(
              "This type of transaction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again."
            )
          )

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
  }, [ledger, unsigned, onSigned, account, isRaw, t])

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
export default SignLedgerSubstrateLegacy
