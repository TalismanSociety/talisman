import { appStore } from "@core/domains/app"
import { api } from "@ui/api"
import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import { useAppState } from "./useAppState"
import useBalances from "./useBalances"
import { useMnemonicBackupConfirmed } from "./useMnemonicBackupConfirmed"
import { useTalismanSeedAccounts } from "./useTalismanSeedAccounts"

const useMnemonicBackup = () => {
  const [hasFunds] = useAppState("hasFunds")
  const [hideBackupWarningUntil] = useAppState("hideBackupWarningUntil")
  const snoozeBackupReminder = useCallback(() => appStore.snoozeBackupReminder(), [])
  const balances = useBalances()

  const backupConfirmed = useMnemonicBackupConfirmed()

  const talismanSeedAddresses = useTalismanSeedAccounts().map((acc) => acc.address)

  const { isConfirmed, isNotConfirmed } = useMemo(
    () => ({
      isConfirmed: backupConfirmed === "TRUE",
      isNotConfirmed: backupConfirmed === "FALSE",
    }),
    [backupConfirmed]
  )

  const isSnoozed = useMemo(() => {
    return Boolean(hideBackupWarningUntil && hideBackupWarningUntil > Date.now() && isNotConfirmed)
  }, [hideBackupWarningUntil, isNotConfirmed])

  // the `showBackupModal` url query param exists only when opening the backup modal
  // while we show the backup modal, we should not show the backup warning modal
  const [searchParams] = useSearchParams()

  const showBackupWarning = useMemo(
    () =>
      !isSnoozed &&
      isNotConfirmed &&
      hasFunds &&
      searchParams.get("showBackupModal") === null &&
      !!talismanSeedAddresses.length &&
      balances.each.some(
        (bal) => bal.free.planck > 0n && talismanSeedAddresses.includes(bal.address)
      ),
    [isSnoozed, isNotConfirmed, hasFunds, searchParams, talismanSeedAddresses, balances]
  )

  // toggle menmonic confirmed
  const toggleConfirmed = useCallback((confirmed: boolean) => api.mnemonicConfirm(confirmed), [])

  const confirm = useCallback(() => toggleConfirmed(true), [toggleConfirmed])

  return {
    isConfirmed,
    isNotConfirmed,
    toggleConfirmed,
    confirm,
    showBackupWarning,
    snoozeBackupReminder,
    isSnoozed,
  }
}

export default useMnemonicBackup
