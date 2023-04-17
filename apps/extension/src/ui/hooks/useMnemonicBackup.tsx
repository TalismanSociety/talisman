import { AccountTypes } from "@core/domains/accounts/types"
import { appStore } from "@core/domains/app"
import { api } from "@ui/api"
import { useCallback, useEffect, useMemo, useState } from "react"

import useAccounts from "./useAccounts"
import { useAppState } from "./useAppState"
import useBalances from "./useBalances"
import { useMnemonicBackupConfirmed } from "./useMnemonicBackupConfirmed"

const useMnemonicBackup = () => {
  const [hasFunds] = useAppState("hasFunds")
  const [hideBackupWarningUntil] = useAppState("hideBackupWarningUntil")
  const snoozeBackupReminder = useCallback(() => appStore.snoozeBackupReminder(), [])
  const [talismanSeedAccountHasFunds, setTalismanSeedAccountHasFunds] = useState(hasFunds)
  const balances = useBalances()
  const accounts = useAccounts()

  const backupConfirmed = useMnemonicBackupConfirmed()

  const talismanSeedAddresses = useMemo(() => {
    const seedAccount = accounts.find((acc) => acc.origin === AccountTypes.ROOT)
    if (!seedAccount) return []
    return [
      seedAccount.address,
      ...accounts
        .filter((acc) => acc.origin === AccountTypes.DERIVED && acc.parent === seedAccount.address)
        .map((acc) => acc.address),
    ]
  }, [accounts])

  useEffect(() => {
    if (!hasFunds) {
      // shortcut
      setTalismanSeedAccountHasFunds(false)
    } else {
      const talismanAccountsPositiveBalances = balances.find(
        (bal) => talismanSeedAddresses.includes(bal.address) && bal.free.planck > 0
      ).count

      setTalismanSeedAccountHasFunds(Boolean(talismanAccountsPositiveBalances))
    }
  }, [hasFunds, balances, talismanSeedAddresses])

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

  const showBackupWarning = useMemo(() => {
    return !isSnoozed && isNotConfirmed && talismanSeedAccountHasFunds
  }, [isSnoozed, isNotConfirmed, talismanSeedAccountHasFunds])

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
