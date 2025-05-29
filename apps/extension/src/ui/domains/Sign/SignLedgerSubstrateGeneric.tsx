import {
  AccountLedgerPolkadot,
  isAccountLedgerPolkadotGeneric,
  isAccountOfType,
} from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useMemo } from "react"

import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerPolkadot } from "@ui/hooks/ledger/useLedgerPolkadot"
import { useLedgerSubstrateAppByName } from "@ui/hooks/ledger/useLedgerSubstrateApp"
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
  const account = useAccountByAddress(payload?.address)

  const migrationAppName = useMemo(
    () => (isAccountOfType(account, "ledger-polkadot") ? account.app : null),
    [account],
  )

  const legacyApp = useLedgerSubstrateAppByName(migrationAppName as string)
  const { sign } = useLedgerPolkadot({ legacyApp })

  const { isSigning, error, setIsSigning, setError } = useSignLedgerBase()

  const signWithLedger = useCallback(async () => {
    if (!payload || !onSigned || !account || !isAccountLedgerPolkadotGeneric(account)) return

    onSentToDevice?.(true)
    setIsSigning(true)

    try {
      const signature = await sign(
        payload,
        account as AccountLedgerPolkadot,
        registry,
        shortMetadata,
      )

      // await to keep loader spinning until popup closes
      await onSigned({ signature })
    } catch (err) {
      const error = getTalismanLedgerError(err)
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
    setIsSigning,
    setError,
    registry,
    shortMetadata,
    sign,
  ])

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
