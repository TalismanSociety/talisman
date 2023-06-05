import { appStore } from "@core/domains/app"
import { api } from "@ui/api"
import { useCallback, useMemo } from "react"

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

  const showBackupWarning = useMemo(
    () =>
      !isSnoozed &&
      isNotConfirmed &&
      hasFunds &&
      !!talismanSeedAddresses.length &&
      balances.each.some(
        (bal) => bal.free.planck > 0n && talismanSeedAddresses.includes(bal.address)
      ),
    [isSnoozed, isNotConfirmed, hasFunds, balances, talismanSeedAddresses]
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
