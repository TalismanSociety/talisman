import { passwordStore } from "@core/domains/app"
import * as Sentry from "@sentry/react"
import useStatus, { statusOptions } from "@talisman/hooks/useStatus"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback, useEffect, useState } from "react"

const useMigratePasswordProvider = ({ onComplete }: { onComplete: () => void }) => {
  const [password, setPassword] = useState<string>()
  const [newPassword, setNewPassword] = useState<string>()
  const [passwordTrimmed, setPasswordTrimmed] = useState<boolean>()
  const [mnemonic, setMnemonic] = useState<string>()
  const [hasBackedUpMnemonic, setHasBackedUpMnemonic] = useState<boolean>(false)
  const [error, setError] = useState<Error>()
  const [useErrorTracking] = useSetting("useErrorTracking")
  const { setStatus, status, message } = useStatus()
  const { isNotConfirmed, confirm } = useMnemonicBackup()

  useEffect(() => {
    if (!password) return
    passwordStore.get("isTrimmed").then((isTrimmed) => {
      setPasswordTrimmed(isTrimmed && password !== password.trim())
    })
  }, [password])

  useEffect(() => {
    if (error && useErrorTracking) Sentry.captureException(error)
  }, [error, useErrorTracking])

  const hasPassword = !!password
  const hasNewPassword = !!newPassword

  const setMnemonicBackupConfirmed = useCallback(async () => {
    isNotConfirmed && (await confirm())
    setHasBackedUpMnemonic(true)
  }, [confirm, setHasBackedUpMnemonic, isNotConfirmed])

  const migratePassword = useCallback(async () => {
    if ((passwordTrimmed && !newPassword) || !password || !mnemonic) return
    setStatus.processing()
    // decide whether to use the new password or to use the same one
    let newPw = password
    if (passwordTrimmed && newPassword) {
      newPw = newPassword
    }
    try {
      await api.changePassword(password, newPw, newPw)
      setStatus.success()
    } catch (err) {
      setError(err as Error)
      setStatus.error((err as Error).message)
    }
  }, [mnemonic, newPassword, password, passwordTrimmed, setStatus])

  useEffect(() => {
    if (status === statusOptions.INITIALIZED && hasBackedUpMnemonic) {
      migratePassword()
    }
  }, [hasBackedUpMnemonic, status, migratePassword])

  return {
    hasPassword,
    hasNewPassword,
    setPassword,
    setNewPassword,
    passwordTrimmed,
    mnemonic,
    setMnemonic,
    migratePassword,
    status,
    statusMessage: message,
    error,
    hasBackedUpMnemonic,
    setMnemonicBackupConfirmed,
    onComplete,
  }
}

const [MigratePasswordProvider, useMigratePassword] = provideContext(useMigratePasswordProvider)

export { MigratePasswordProvider, useMigratePassword }
