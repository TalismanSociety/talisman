import { appStore } from "@extension/core"
import { api } from "@ui/api"
import { balanceTotalsAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"
import { useLocation } from "react-router-dom"

import useAccounts from "./useAccounts"
import { useAppState } from "./useAppState"
import { useMnemonics } from "./useMnemonics"

const useMnemonicBackup = () => {
  const [hideBackupWarningUntil] = useAppState("hideBackupWarningUntil")
  const mnemonics = useMnemonics()
  const balanceTotals = useAtomValue(balanceTotalsAtom)
  const accounts = useAccounts("owned")

  const snoozeBackupReminder = useCallback(() => appStore.snoozeBackupReminder(), [])
  const location = useLocation()

  const hasMnemonics = useMemo(() => mnemonics.length > 0, [mnemonics])

  const allBackedUp = useMemo(
    () => !hasMnemonics || mnemonics.every((mnemonic) => mnemonic.confirmed),
    [mnemonics, hasMnemonics]
  )

  const notBackedUp = useMemo(
    () => mnemonics.filter((mnemonic) => !mnemonic.confirmed),
    [mnemonics]
  )

  const notBackedUpAddresses = useMemo(
    () =>
      accounts
        .filter(
          (account) =>
            account.derivedMnemonicId &&
            notBackedUp.map((m) => m.id).includes(account.derivedMnemonicId)
        )
        .map((account) => account.address),
    [accounts, notBackedUp]
  )

  const hasFundsInNotBackedUpAddresses = useMemo(
    () => balanceTotals.some((bt) => notBackedUpAddresses.includes(bt.address) && !!bt.total),
    [balanceTotals, notBackedUpAddresses]
  )

  const isSnoozed = useMemo(() => {
    return Boolean(hideBackupWarningUntil && hideBackupWarningUntil > Date.now())
  }, [hideBackupWarningUntil])

  // whether we must show any type of warning
  const showBackupWarning = useMemo(
    () => !isSnoozed && hasMnemonics && !allBackedUp && hasFundsInNotBackedUpAddresses,
    [isSnoozed, allBackedUp, hasMnemonics, hasFundsInNotBackedUpAddresses]
  )

  // hide the backup warning banner or modal if we are on the backup page
  const showBackupWarningBannerOrModal = useMemo(
    () => showBackupWarning && location.pathname !== "/settings/mnemonics",
    [showBackupWarning, location.pathname]
  )

  // if the backup has never been snoozed, we show the backup warning modal
  const showBackupWarningModal = useMemo(
    () => showBackupWarningBannerOrModal && hideBackupWarningUntil === undefined,
    [showBackupWarningBannerOrModal, hideBackupWarningUntil]
  )

  // otherwise we show the banner notification
  const showBackupWarningBanner = useMemo(
    () => showBackupWarningBannerOrModal && !showBackupWarningModal,
    [showBackupWarningBannerOrModal, showBackupWarningModal]
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
    notBackedUpCount: notBackedUp.length,
    toggleConfirmed,
    confirm,
    showBackupWarning,
    showBackupWarningModal,
    showBackupWarningBanner,
    snoozeBackupReminder,
    isSnoozed,
  }
}

export default useMnemonicBackup
