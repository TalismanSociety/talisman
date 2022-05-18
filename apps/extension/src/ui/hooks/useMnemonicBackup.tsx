import { useMemo } from "react"
import { api } from "@ui/api"
import { useMnemonicBackupConfirmed } from "./useMnemonicBackupConfirmed"

const useMnemonicBackup = () => {
  const backupConfirmed = useMnemonicBackupConfirmed()
  const isConfirmed = useMemo(() => backupConfirmed === "TRUE", [backupConfirmed])

  // toggle menmonic confirmed
  const toggleConfirmed = (confirmed: boolean) => api.mnemonicConfirm(confirmed)

  return {
    isConfirmed,
    toggleConfirmed,
  }
}

export default useMnemonicBackup
