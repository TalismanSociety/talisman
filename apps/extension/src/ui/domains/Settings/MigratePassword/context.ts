import { passwordStore } from "@core/domains/app"
import useStatus, { statusOptions } from "@talisman/hooks/useStatus"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useEffect, useState } from "react"

const useMigratePasswordProvider = () => {
  const [password, setPassword] = useState<string>()
  const [newPassword, setNewPassword] = useState<string>()
  const [passwordTrimmed, setPasswordTrimmed] = useState<boolean>()
  const [mnemonic, setMnemonic] = useState<string>()
  const [hasBackedUpMnemonic, setHasBackedUpMnemonic] = useState<boolean>(false)
  const { setStatus, status } = useStatus()

  useEffect(() => {
    if (!password) return
    passwordStore.get("isTrimmed").then((isTrimmed) => {
      setPasswordTrimmed(isTrimmed && password !== password.trim())
    })
  }, [password])

  const hasPassword = !!password
  const hasNewPassword = !!newPassword

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
    hasBackedUpMnemonic,
    setHasBackedUpMnemonic,
  }
}

const [MigratePasswordProvider, useMigratePassword] = provideContext(useMigratePasswordProvider)

export { MigratePasswordProvider, useMigratePassword }
