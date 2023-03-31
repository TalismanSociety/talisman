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

  const showBackupWarning = useMemo(() => {
    return Boolean(
      (hideBackupWarningUntil === undefined || hideBackupWarningUntil < Date.now()) &&
        isNotConfirmed
    )
  }, [hideBackupWarningUntil, isNotConfirmed])

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
  }
}

export default useMnemonicBackup
