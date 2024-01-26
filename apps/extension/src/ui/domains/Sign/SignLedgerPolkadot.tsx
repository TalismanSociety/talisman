import { AccountJsonHardwarePolkadot } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { log } from "@core/log"
import { wrapBytes } from "@polkadot/extension-dapp/wrapBytes"
import { TypeRegistry } from "@polkadot/types"
import { assert } from "@polkadot/util"
import { classNames } from "@talismn/util"
import { useLedgerPolkadot } from "@ui/hooks/ledger/useLedgerPolkadot"
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

const LEDGER_NO_ERRORS = "No errors"

const registry = new TypeRegistry()

function isRawPayload(payload: SignerPayloadJSON | SignerPayloadRaw): payload is SignerPayloadRaw {
  return !!(payload as SignerPayloadRaw).data
}

const SignLedgerPolkadot: FC<SignHardwareSubstrateProps> = ({
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
  //const [unsigned, setUnsigned] = useState<Uint8Array>()
  //const [isRaw, setIsRaw] = useState<boolean>()
  const { ledger, refresh, status, message, isReady, requiresManualRetry } = useLedgerPolkadot()

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

  //   if (isRawPayload(payload)) {
  //     console.log("payload", payload)
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

  const onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  const signLedger = useCallback(async () => {
    if (!ledger || !onSigned || !account || !payload) return

    try {
      const derivationPath = (account as AccountJsonHardwarePolkadot).path
      assert(derivationPath, "Account derivation path not found")
      log.log("signing", { payload, account })

      if (isRawPayload(payload)) {
        setError(null)
        const signResult = await ledger.signRaw(
          derivationPath,
          Buffer.from(wrapBytes(payload.data))
        )

        if (signResult.errorMessage !== LEDGER_NO_ERRORS) throw new Error(signResult.errorMessage)
        const signature = ("0x" + signResult.signature.toString("hex")) as `0x${string}`
        await onSigned({ signature })
      } else {
        setError(null)
        if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
        const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
          version: payload.version,
        })

        const signResult = await ledger.sign(
          derivationPath,
          Buffer.from(extrinsicPayload.toU8a(true)),
          Buffer.from("") // TODO
        )

        if (signResult.errorMessage !== LEDGER_NO_ERRORS) throw new Error(signResult.errorMessage)
        const signature = ("0x" + signResult.signature.toString("hex")) as `0x${string}`
        await onSigned({ signature })
        throw new Error("not implemented")
      }
    } catch (error) {
      const message = (error as Error)?.message

      switch (message) {
        // TODO tx rejected
        case "Transaction rejected":
          window.close() // closing the popup rejects the tx
          return

        // case "Txn version not supported":
        //   return setError(
        //     t(
        //       "This type of transaction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again."
        //     )
        //   )

        // case "Instruction not supported":
        //   return setError(
        //     t(
        //       "This instruction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again."
        //     )
        //   )

        default:
          log.error("ledger sign Polkadot : " + message, { error })
          setError(message)
      }
    }
  }, [ledger, onSigned, account, payload])

  useEffect(() => {
    if (isReady && !error && payload && !isSigning) {
      setIsSigning(true)
      onSentToDevice?.(true)
      signLedger().finally(() => {
        setIsSigning(false)
        onSentToDevice?.(false)
      })
    }
  }, [signLedger, isSigning, error, isReady, onSentToDevice, payload])

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
export default SignLedgerPolkadot
