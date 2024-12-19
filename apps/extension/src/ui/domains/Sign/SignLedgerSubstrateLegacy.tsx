import { classNames } from "@talismn/util"
import { FC, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { AccountJsonHardwareSubstrate } from "@extension/core"
import { log } from "@extension/shared"
import { getCustomTalismanLedgerError, TalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"
import { useAccountByAddress } from "@ui/state"

import { ErrorMessageDrawer } from "./ErrorMessageDrawer"
import { SignHardwareSubstrateProps } from "./SignHardwareSubstrate"

const SignLedgerSubstrateLegacy: FC<SignHardwareSubstrateProps> = ({
  className = "",
  onSigned,
  onSentToDevice,
  onCancel,
  payload,
  containerId,
  registry,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(payload?.address)

  const [{ status, error }, setState] = useState<{
    status: "ready" | "signing" | "signed"
    error: TalismanLedgerError | null
  }>({ status: "ready", error: null })
  //const { sign } = useLedgerSubstrateGeneric({ legacyApp })

  // reset
  useEffect(() => {
    setState({ status: "ready", error: null })
  }, [payload])

  const setError = useCallback((error: TalismanLedgerError | null) => {
    setState({ status: "ready", error })
  }, [])

  // const [isSigning, setIsSigning] = useState(false)
  // const [error, setError] = useState<string | null>(null)
  // const [unsigned, setUnsigned] = useState<Uint8Array>()
  // const [isRaw, setIsRaw] = useState<boolean>()
  const { sign } = useLedgerSubstrateLegacy(account?.genesisHash)

  const signWithLedger = useCallback(async () => {
    if (!payload || !onSigned || !account) return
    if (!registry) return setError(getCustomTalismanLedgerError(t("Missing registry.")))

    onSentToDevice?.(true)
    setState({ status: "signing", error: null })

    try {
      const signature = await sign(payload, account as AccountJsonHardwareSubstrate, registry)

      // await to keep loader spinning until popup closes
      await onSigned({ signature })
    } catch (err) {
      const error = getCustomTalismanLedgerError(err)
      log.error("signLedger", { error })
      setError(error)
    } finally {
      onSentToDevice?.(false)
    }
  }, [payload, onSigned, account, onSentToDevice, setError, t, registry, sign])

  // const connectionStatus: LedgerConnectionStatusProps = useMemo(
  //   () => ({
  //     status: status === "ready" ? "connecting" : status,
  //     message: status === "ready" ? t("Please approve from your Ledger.") : message,
  //     refresh,
  //     requiresManualRetry,
  //   }),
  //   [refresh, status, message, requiresManualRetry, t],
  // )

  // useEffect(() => {
  //   if (!payload) return

  //   if (isRawPayload(payload)) {
  //     const tmpUnsigned = u8aWrapBytes(payload.data)
  //     if (tmpUnsigned.length > 256) setError(t("The message is too long to be signed with Ledger."))

  //     setUnsigned(tmpUnsigned)
  //     setIsRaw(true)
  //   } else if (registry) {
  //     // Legacy dapps don't support the CheckMetadataHash signed extension
  //     if (payload.signedExtensions.includes("CheckMetadataHash"))
  //       return setError("GENERIC_APP_REQUIRED") // this error message is handled in the rendering component because of a link to docs

  //     const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
  //       version: payload.version,
  //     })
  //     setUnsigned(extrinsicPayload.toU8a(true))
  //     setIsRaw(false)
  //   }
  // }, [payload, registry, t])

  // const onRefresh = useCallback(() => {
  //   refresh()
  //   setError(null)
  // }, [refresh, setError])

  // const signLedger = useCallback(async () => {
  //   if (!ledger || !unsigned || !onSigned || !account) return

  //   if (isRaw && unsigned.length > 256)
  //     return setError(t("The message is too long to be signed with Ledger."))

  //   setError(null)

  //   try {
  //     const {
  //       signature: signatureBuffer,
  //       error_message,
  //       return_code,
  //     } = await (isRaw
  //       ? ledger.signRaw(
  //           LEDGER_HARDENED_OFFSET + (account.accountIndex ?? 0),
  //           LEDGER_HARDENED_OFFSET + 0,
  //           LEDGER_HARDENED_OFFSET + (account.addressOffset ?? 0),
  //           Buffer.from(unsigned),
  //         )
  //       : ledger.sign(
  //           LEDGER_HARDENED_OFFSET + (account.accountIndex ?? 0),
  //           LEDGER_HARDENED_OFFSET + 0,
  //           LEDGER_HARDENED_OFFSET + (account.addressOffset ?? 0),
  //           Buffer.from(unsigned),
  //         ))

  //     if (return_code !== LEDGER_SUCCESS_CODE)
  //       throw new LedgerError(error_message, "SignError", return_code)

  //     // remove first byte which stores the signature type (0 here, as 0 = ed25519)
  //     const signature = isRaw
  //       ? u8aToHex(new Uint8Array(signatureBuffer.slice(1)))
  //       : u8aToHex(new Uint8Array(signatureBuffer))

  //     // await to keep loader spinning until popup closes
  //     await onSigned({ signature })
  //   } catch (error) {
  //     const message = (error as Error)?.message
  //     switch (message) {
  //       case "Transaction rejected":
  //         return

  //       case "Txn version not supported":
  //         return setError(
  //           t(
  //             "This type of transaction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again.",
  //           ),
  //         )

  //       case "Instruction not supported":
  //         return setError(
  //           t(
  //             "This instruction is not supported on your ledger. You should check for firmware and app updates in Ledger Live before trying again.",
  //           ),
  //         )

  //       default:
  //         log.error("ledger sign Substrate : " + message, { error })
  //         setError(message)
  //     }
  //   }
  // }, [ledger, unsigned, onSigned, account, isRaw, t])

  // useEffect(() => {
  //   if (isReady && !error && unsigned && !isSigning) {
  //     setIsSigning(true)
  //     onSentToDevice?.(true)
  //     signLedger().finally(() => {
  //       setIsSigning(false)
  //       onSentToDevice?.(false)
  //     })
  //   }
  // }, [signLedger, isSigning, error, isReady, onSentToDevice, unsigned])

  // const handleCloseDrawer = useCallback(() => setError(null), [setError])

  return (
    <div
      className={classNames(
        "grid w-full grid-cols-2 gap-8",
        onCancel ? "grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {!!onCancel && <Button onClick={onCancel}>{t("Cancel")}</Button>}
      <Button primary processing={status !== "ready"} onClick={signWithLedger} className="px-4">
        {t("Approve on Ledger")}
      </Button>
      <ErrorMessageDrawer
        message={error?.message}
        containerId={containerId}
        onDismiss={() => setError(null)}
      />
    </div>
  )
}

// default export to allow for lazy loading
export default SignLedgerSubstrateLegacy
