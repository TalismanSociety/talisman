import { useCallback, useMemo } from "react"
import { api } from "@ui/api"
import { useMnemonicBackupConfirmed } from "./useMnemonicBackupConfirmed"

const useMnemonicBackup = () => {
  const backupConfirmed = useMnemonicBackupConfirmed()
  const { isConfirmed, isNotConfirmed } = useMemo(
    () => ({
      isConfirmed: backupConfirmed === "TRUE",
      isNotConfirmed: backupConfirmed === "FALSE",
    }),
    [backupConfirmed]
  )

  // toggle menmonic confirmed
  const toggleConfirmed = useCallback((confirmed: boolean) => api.mnemonicConfirm(confirmed), [])

  const confirm = useCallback(() => toggleConfirmed(true), [toggleConfirmed])

  return {
    isConfirmed,
    isNotConfirmed,
    toggleConfirmed,
    confirm,
  }
}

export default useMnemonicBackup
