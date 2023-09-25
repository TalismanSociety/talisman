import { appStore } from "@core/domains/app"
import { api } from "@ui/api"
import { useCallback, useMemo } from "react"
import { useLocation } from "react-router-dom"

import { useAppState } from "./useAppState"
import { useMnemonics } from "./useMnemonics"

const useMnemonicBackup = () => {
  const [hasFunds] = useAppState("hasFunds")
  const [hideBackupWarningUntil] = useAppState("hideBackupWarningUntil")
  const snoozeBackupReminder = useCallback(() => appStore.snoozeBackupReminder(), [])
  const mnemonics = useMnemonics()
  const location = useLocation()

  const allBackedUp = useMemo(() => mnemonics.every((mnemonic) => mnemonic.confirmed), [mnemonics])
  const anyBackedUp = useMemo(() => mnemonics.some((mnemonic) => mnemonic.confirmed), [mnemonics])

  const isSnoozed = useMemo(() => {
    return Boolean(hideBackupWarningUntil && hideBackupWarningUntil > Date.now() && !anyBackedUp)
  }, [hideBackupWarningUntil, anyBackedUp])

  // whether we must show the big backup warning modal
  const showBackupWarning = useMemo(
    () => !isSnoozed && !anyBackedUp && hasFunds && location.pathname !== "/settings/mnemonics",
    [isSnoozed, anyBackedUp, hasFunds, location.pathname]
  )

  // whether we must show the small backup warning notification in dashboard
  const showBackupNotification = useMemo(
    () => !showBackupWarning && !allBackedUp,
    [showBackupWarning, allBackedUp]
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
    showBackupNotification,
    snoozeBackupReminder,
    isSnoozed,
  }
}

export default useMnemonicBackup
