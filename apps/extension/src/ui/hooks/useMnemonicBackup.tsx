import { appStore } from "@core/domains/app"
import { api } from "@ui/api"
import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import { useAppState } from "./useAppState"
import useBalances from "./useBalances"
import { useSeedPhrases } from "./useSeedPhrases"
import { useTalismanSeedAccounts } from "./useTalismanSeedAccounts"

const useMnemonicBackup = () => {
  const [hasFunds] = useAppState("hasFunds")
  const [hideBackupWarningUntil] = useAppState("hideBackupWarningUntil")
  const snoozeBackupReminder = useCallback(() => appStore.snoozeBackupReminder(), [])
  const balances = useBalances()

  const mnemonics = useSeedPhrases()
  const talismanSeedAddresses = useTalismanSeedAccounts().map((acc) => acc.address)

  const allBackedUp = useMemo(
    () =>
      Object.values(mnemonics)
        .map((mnemonic) => mnemonic?.confirmed)
        .every(Boolean),
    [mnemonics]
  )

  const isSnoozed = useMemo(() => {
    return Boolean(hideBackupWarningUntil && hideBackupWarningUntil > Date.now() && !allBackedUp)
  }, [hideBackupWarningUntil, allBackedUp])

  // the `showBackupModal` url query param exists only when opening the backup modal
  // while we show the backup modal, we should not show the backup warning modal
  const [searchParams] = useSearchParams()

  const showBackupWarning = useMemo(
    () =>
      !isSnoozed &&
      !allBackedUp &&
      hasFunds &&
      searchParams.get("showBackupModal") === null &&
      !!talismanSeedAddresses.length &&
      balances.each.some(
        (bal) => bal.free.planck > 0n && talismanSeedAddresses.includes(bal.address)
      ),
    [isSnoozed, allBackedUp, hasFunds, searchParams, talismanSeedAddresses, balances]
  )

  // toggle menmonic confirmed
  const toggleConfirmed = useCallback(
    (mnemonicId: string, confirmed: boolean) => api.mnemonicConfirm(mnemonicId, confirmed),
    []
  )

  const confirm = useCallback(
    (mnemonicId: string) => toggleConfirmed(mnemonicId, true),
    [toggleConfirmed]
  )

  return {
    allBackedUp,
    toggleConfirmed,
    confirm,
    showBackupWarning,
    snoozeBackupReminder,
    isSnoozed,
  }
}

export default useMnemonicBackup
