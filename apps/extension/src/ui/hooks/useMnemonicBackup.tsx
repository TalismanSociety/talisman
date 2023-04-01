import { api } from "@ui/api"
import { useCallback, useMemo } from "react"

import { useAppState } from "./useAppState"
import { useMnemonicBackupConfirmed } from "./useMnemonicBackupConfirmed"

const useMnemonicBackup = () => {
  const { hideBackupWarningUntil, snoozeBackupReminder } = useAppState()
  const backupConfirmed = useMnemonicBackupConfirmed()

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
    return !isSnoozed && isNotConfirmed
  }, [isSnoozed, isNotConfirmed])

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
