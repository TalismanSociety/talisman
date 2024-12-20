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

  // reset
  useEffect(() => {
    setState({ status: "ready", error: null })
  }, [payload])

  const setError = useCallback((error: TalismanLedgerError | null) => {
    setState({ status: "ready", error })
  }, [])

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

  return (
    <div
      className={classNames(
        "grid w-full gap-8",
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
