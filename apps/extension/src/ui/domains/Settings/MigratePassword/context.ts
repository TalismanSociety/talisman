import { passwordStore } from "@core/domains/app"
import { provideContext } from "@talisman/util/provideContext"
import { useEffect, useState } from "react"

const useMigratePasswordProvider = () => {
  const [password, setPassword] = useState<string>()
  const [newPassword, setNewPassword] = useState<string>()
  const [passwordTrimmed, setPasswordTrimmed] = useState<boolean>()
  const [mnemonic, setMnemonic] = useState<string>()
  const [hasBackedUpMnemonic, setHasBackedUpMnemonic] = useState<boolean>(false)

  useEffect(() => {
    passwordStore.get("isTrimmed").then((isTrimmed) => {
      setPasswordTrimmed(isTrimmed && (password?.startsWith(" ") || password?.endsWith(" ")))
    })
  }, [password])

  const hasPassword = !!password
  const hasNewPassword = !!newPassword

  return {
    hasPassword,
    hasNewPassword,
    setPassword,
    setNewPassword,
    passwordTrimmed,
    mnemonic,
    setMnemonic,
    hasBackedUpMnemonic,
    setHasBackedUpMnemonic,
  }
}

const [MigratePasswordProvider, useMigratePassword] = provideContext(useMigratePasswordProvider)

export { MigratePasswordProvider, useMigratePassword }
