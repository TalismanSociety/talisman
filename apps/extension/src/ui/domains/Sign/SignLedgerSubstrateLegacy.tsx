import { AccountLedgerPolkadot, isJsonPayload } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"
import { useAccountByAddress } from "@ui/state"

import { SignHardwareSubstrateProps } from "./SignHardwareSubstrate"
import { SignLedgerBase } from "./SignLedgerBase"
import { useSignLedgerBase } from "./useSignLedgerBase"

export const SignLedgerSubstrateLegacy: FC<SignHardwareSubstrateProps> = ({
  className = "",
  onSigned,
  onSentToDevice,
  onCancel,
  payload,
  containerId,
  registry,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(payload?.address) as AccountLedgerPolkadot | null
  const { sign } = useLedgerSubstrateLegacy(account?.genesisHash)

  const { isSigning, error, setIsSigning, setError } = useSignLedgerBase()

  const signWithLedger = useCallback(async () => {
    if (!payload || !onSigned || !account) return
    if (isJsonPayload(payload) && !registry)
      return setError(getTalismanLedgerError(t("Missing registry.")))

    onSentToDevice?.(true)
    setIsSigning(true)

    try {
      const signature = await sign(payload, account, registry)

      // await to keep loader spinning until popup closes
      await onSigned({ signature })
    } catch (err) {
      const error = getTalismanLedgerError(err)
      log.error("signLedger", { error })
      setError(error)
    } finally {
      onSentToDevice?.(false)
    }
  }, [payload, onSigned, account, registry, setError, t, onSentToDevice, setIsSigning, sign])

  return (
    <SignLedgerBase
      containerId={containerId}
      isProcessing={isSigning}
      error={error}
      className={className}
      onSignClick={signWithLedger}
      onDismissErrorClick={() => setError(null)}
      onCancel={onCancel}
    />
  )
}
