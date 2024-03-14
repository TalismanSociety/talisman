import { passwordStore } from "@extension/core"
import * as Sentry from "@sentry/react"
import useStatus, { statusOptions } from "@talisman/hooks/useStatus"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useMnemonics } from "@ui/hooks/useMnemonics"
import { useSensitiveState } from "@ui/hooks/useSensitiveState"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useDismissMigratePasswordModal } from "./useMigratePasswordModal"

const useMigratePasswordProvider = ({ onComplete }: { onComplete: () => void }) => {
  const [password, setPassword] = useSensitiveState<string>()
  const [newPassword, setNewPassword] = useSensitiveState<string>()
  const [mnemonic, setMnemonic] = useSensitiveState<string>()
  const [passwordTrimmed, setPasswordTrimmed] = useState<boolean>()
  const [error, setError] = useState<Error>()
  const [useErrorTracking] = useSetting("useErrorTracking")
  const { setStatus, status, message } = useStatus()
  const { allBackedUp, confirm } = useMnemonicBackup()
  const mnemonics = useMnemonics()

  // assume that if password has not been migrated yet, there is only one mnemonic
  const mnemonicId = useMemo(() => mnemonics[0]?.id, [mnemonics])

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
    mnemonicId && !allBackedUp && (await confirm(mnemonicId))
  }, [confirm, allBackedUp, mnemonicId])

  const migratePassword = useCallback(async () => {
    if ((passwordTrimmed && !newPassword) || !password || !allBackedUp) return
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
  }, [allBackedUp, newPassword, password, passwordTrimmed, setStatus])

  useEffect(() => {
    if (status === statusOptions.INITIALIZED && allBackedUp) {
      migratePassword()
    }
  }, [allBackedUp, status, migratePassword])

  const dismiss = useDismissMigratePasswordModal()

  const closeAndComplete = useCallback(() => {
    dismiss()
    onComplete()
  }, [dismiss, onComplete])

  return {
    mnemonicId,
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
    hasBackedUpMnemonic: allBackedUp,
    setMnemonicBackupConfirmed,
    onComplete: closeAndComplete,
  }
}

const [MigratePasswordProvider, useMigratePassword] = provideContext(useMigratePasswordProvider)

export { MigratePasswordProvider, useMigratePassword }
