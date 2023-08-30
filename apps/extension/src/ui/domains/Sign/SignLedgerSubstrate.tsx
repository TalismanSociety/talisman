import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { log } from "@core/log"
import { TypeRegistry } from "@polkadot/types"
import { classNames } from "@talismn/util"
import { useLedgerSubstrate } from "@ui/hooks/ledger/useLedgerSubstrate"
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

const SignLedgerSubstrate: FC<SignHardwareSubstrateProps> = ({
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
  const { ledger, refresh, status, message, isReady, requiresManualRetry } = useLedgerSubstrate(
    account?.genesisHash
  )

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
      setError(t("Message signing is not supported for hardware wallets."))
    } else {
      if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
      setUnsigned(
        registry.createType("ExtrinsicPayload", payload, { version: payload.version }).toU8a(true)
      )
    }
  }, [payload, t])

  const _onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  const signLedger = useCallback(async () => {
    if (!ledger || !unsigned || !onSigned || !account) {
      return
    }

    setError(null)

    try {
      const { signature } = await ledger.sign(unsigned, account.accountIndex, account.addressOffset)

      // await to keep loader spinning until popup closes
      await onSigned({ signature })
    } catch (err) {
      const error = err as Error
      if (error.message === "Transaction rejected") return
      if (error.message === "Txn version not supported")
        setError(
          t(
            "This type of transaction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again."
          )
        )
      else {
        log.error("ledger sign Substrate : " + error.message, { err })
        setError(error.message)
      }
    }
  }, [account, ledger, onSigned, unsigned, setError, t])

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

  const handleCloseDrawer = useCallback(() => {
    if (payload && isRawPayload(payload)) onCancel?.()
    else setError(null)
  }, [onCancel, payload])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      {!error && (
        <LedgerConnectionStatus
          {...{ ...connectionStatus }}
          refresh={_onRefresh}
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
export default SignLedgerSubstrate
