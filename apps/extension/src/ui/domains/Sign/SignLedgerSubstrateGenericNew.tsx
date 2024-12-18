import { classNames } from "@talismn/util"
import { FC, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { AccountJsonHardwareSubstrate, isJsonPayload } from "@extension/core"
import { log } from "@extension/shared"
import { getCustomTalismanLedgerError, TalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSubstrateAppByName } from "@ui/hooks/ledger/useLedgerSubstrateApp"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGenericNew"
import { useAccountByAddress } from "@ui/state"

import { ErrorMessageDrawer } from "./ErrorMessageDrawer"
import { SignHardwareSubstrateProps } from "./SignHardwareSubstrate"

const SignLedgerSubstrateGeneric: FC<SignHardwareSubstrateProps> = ({
  className = "",
  onSigned,
  onSentToDevice,
  onCancel,
  payload,
  containerId,
  shortMetadata,
  registry,
}) => {
  const account = useAccountByAddress(payload?.address)
  const legacyApp = useLedgerSubstrateAppByName(account?.migrationAppName as string)

  const { t } = useTranslation("request")
  const [{ status, error }, setState] = useState<{
    status: "ready" | "signing" | "signed"
    error: TalismanLedgerError | null
  }>({ status: "ready", error: null })
  const { sign } = useLedgerSubstrateGeneric({ legacyApp })

  // reset
  useEffect(() => {
    setState({ status: "ready", error: null })
  }, [payload])

  const setError = useCallback((error: TalismanLedgerError | null) => {
    setState({ status: "ready", error })
  }, [])

  const signWithLedger = useCallback(async () => {
    if (!payload || !onSigned || !account) return

    if (isJsonPayload(payload)) {
      if (!payload.withSignedTransaction)
        return setError(
          getCustomTalismanLedgerError(
            t("This dapp needs to be updated in order to support Ledger signing."),
          ),
        )
      if (!registry) return setError(getCustomTalismanLedgerError(t("Missing registry.")))

      const hasCheckMetadataHash = registry.metadata.extrinsic.signedExtensions.some(
        (ext) => ext.identifier.toString() === "CheckMetadataHash",
      )
      if (!hasCheckMetadataHash)
        return setError(
          getCustomTalismanLedgerError(
            t("This network doesn't support Ledger Polkadot Generic App."),
          ),
        )

      if (!shortMetadata) return setError(getCustomTalismanLedgerError(t("Missing short metadata")))
    }

    onSentToDevice?.(true)
    setState({ status: "signing", error: null })

    try {
      const signature = await sign(
        payload,
        account as AccountJsonHardwareSubstrate,
        registry,
        shortMetadata,
      )

      // await to keep loader spinning until popup closes
      await onSigned({ signature })
    } catch (err) {
      const error = getCustomTalismanLedgerError(err)
      log.error("signLedger", { error })
      setError(error)
    } finally {
      onSentToDevice?.(false)
    }
  }, [payload, onSigned, account, onSentToDevice, setError, t, registry, shortMetadata, sign])

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
export default SignLedgerSubstrateGeneric
