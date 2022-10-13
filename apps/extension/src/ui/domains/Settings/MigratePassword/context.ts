import { provideContext } from "@talisman/util/provideContext"
import { useState } from "react"

const useMigratePasswordProvider = () => {
  const [password, setPassword] = useState<string>()
  const [mnemonic, setMnemonic] = useState<string>()
  const [hasBackedUpMnemonic, setHasBackedUpMnemonic] = useState<boolean>(false)

  const hasPassword = !!password

  return {
    hasPassword,
    setPassword,
    mnemonic,
    setMnemonic,
    hasBackedUpMnemonic,
    setHasBackedUpMnemonic,
  }
}

const [MigratePasswordProvider, useMigratePassword] = provideContext(useMigratePasswordProvider)

export { MigratePasswordProvider, useMigratePassword }
