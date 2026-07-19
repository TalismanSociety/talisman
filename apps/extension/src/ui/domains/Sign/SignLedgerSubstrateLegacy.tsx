import { log } from "@common/log"
import type { AccountLedgerPolkadot } from "@core/domains/keyring/exports"
import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"
import { useAccountByAddress } from "@ui/state/accounts"
import { type FC, useCallback } from "react"

import type { SignHardwareSubstrateProps } from "./SignHardwareSubstrate"
import { SignLedgerBase } from "./SignLedgerBase"
import { useSignLedgerBase } from "./useSignLedgerBase"

export const SignLedgerSubstrateLegacy: FC<SignHardwareSubstrateProps> = ({
  className = "",
  disabled,
  onSigned,
  onSentToDevice,
  onCancel,
  payload,
  containerId,
}) => {
  const account = useAccountByAddress(payload?.address) as AccountLedgerPolkadot | null
  const { sign } = useLedgerSubstrateLegacy(account?.genesisHash)

  const { isSigning, error, setIsSigning, setError } = useSignLedgerBase()

  const signWithLedger = useCallback(async () => {
    if (!payload || !onSigned || !account) return

    onSentToDevice?.(true)
    setIsSigning(true)

    try {
      const signature = await sign(payload, account)

      // await to keep loader spinning until popup closes
      await onSigned({ signature })
    } catch (err) {
      const error = getTalismanLedgerError(err)
      log.error("signLedger", { error })
      setError(error)
    } finally {
      onSentToDevice?.(false)
    }
  }, [payload, onSigned, account, setError, onSentToDevice, setIsSigning, sign])

  return (
    <SignLedgerBase
      containerId={containerId}
      isProcessing={isSigning}
      error={error}
      className={className}
      disabled={disabled}
      onSignClick={signWithLedger}
      onDismissErrorClick={() => setError(null)}
      onCancel={onCancel}
    />
  )
}
