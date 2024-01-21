import { appStore } from "@core/domains/app/store.app"
import { api } from "@ui/api"
import { useCallback, useMemo } from "react"
import { useLocation } from "react-router-dom"

import { useAppState } from "./useAppState"
import { useMnemonics } from "./useMnemonics"
import { usePortfolioAccounts } from "./usePortfolioAccounts"

const useMnemonicBackup = () => {
  const { ownedTotal } = usePortfolioAccounts()
  const [hideBackupWarningUntil] = useAppState("hideBackupWarningUntil")
  const snoozeBackupReminder = useCallback(() => appStore.snoozeBackupReminder(), [])
  const mnemonics = useMnemonics()
  const location = useLocation()

  const hasMnemonics = useMemo(() => mnemonics.length > 0, [mnemonics])

  const allBackedUp = useMemo(
    () => !hasMnemonics || mnemonics.every((mnemonic) => mnemonic.confirmed),
    [mnemonics, hasMnemonics]
  )

  const notBackedUpCount = useMemo(
    () => mnemonics.filter((mnemonic) => !mnemonic.confirmed).length,
    [mnemonics]
  )

  const isSnoozed = useMemo(() => {
    return Boolean(hideBackupWarningUntil && hideBackupWarningUntil > Date.now())
  }, [hideBackupWarningUntil])

  // whether we must show any type of warning
  const showBackupWarning = useMemo(
    () => !isSnoozed && hasMnemonics && !allBackedUp && !!ownedTotal,
    [isSnoozed, allBackedUp, hasMnemonics, ownedTotal]
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
    notBackedUpCount,
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
