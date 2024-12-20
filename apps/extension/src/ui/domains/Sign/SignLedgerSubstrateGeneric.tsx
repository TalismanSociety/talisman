import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { AccountJsonHardwareSubstrate, isJsonPayload } from "@extension/core"
import { log } from "@extension/shared"
import { getCustomTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSubstrateAppByName } from "@ui/hooks/ledger/useLedgerSubstrateApp"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"
import { useAccountByAddress } from "@ui/state"

import { SignHardwareSubstrateProps } from "./SignHardwareSubstrate"
import { SignLedgerBase } from "./SignLedgerBase"
import { useSignLedgerBase } from "./useSignLedgerBase"

export const SignLedgerSubstrateGeneric: FC<SignHardwareSubstrateProps> = ({
  className = "",
  onSigned,
  onSentToDevice,
  onCancel,
  payload,
  containerId,
  shortMetadata,
  registry,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(payload?.address)
  const legacyApp = useLedgerSubstrateAppByName(account?.migrationAppName as string)
  const { sign } = useLedgerSubstrateGeneric({ legacyApp })

  const { status, error, setStatus, setError } = useSignLedgerBase({ payload })

  const signWithLedger = useCallback(async () => {
    if (!payload || !onSigned || !account) return

    // move this inside sign ?
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
    setStatus("signing")

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
  }, [
    payload,
    onSigned,
    account,
    onSentToDevice,
    setStatus,
    setError,
    t,
    registry,
    shortMetadata,
    sign,
  ])

  return (
    <SignLedgerBase
      containerId={containerId}
      isProcessing={status !== "ready"}
      error={error}
      className={className}
      onSignClick={signWithLedger}
      onDismissErrorClick={() => setError(null)}
      onCancel={onCancel}
    />
  )
}
