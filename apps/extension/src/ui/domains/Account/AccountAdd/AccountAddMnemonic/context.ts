import { KeypairCurve } from "@talismn/crypto"
import { RequestAccountCreateFromSuri } from "extension-core"
import { useCallback, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"

export type AccountAddDerivationMode = "first" | "custom" | "multi"

type AccountAddSecretInputs = {
  name: string
  curve: KeypairCurve
  mode: AccountAddDerivationMode
  mnemonic: string
  derivationPath: string
  accounts: RequestAccountCreateFromSuri[]
}

const useAccountAddMnemonicProvider = ({ onSuccess }: { onSuccess: (address: string) => void }) => {
  const [data, setData] = useState<Partial<AccountAddSecretInputs>>(() => ({
    mode: "first",
  }))

  const updateData = useCallback((newData: Partial<AccountAddSecretInputs>) => {
    setData((prev) => ({
      ...prev,
      ...newData,
    }))
  }, [])

  const importAccounts = useCallback(async (accounts: RequestAccountCreateFromSuri[]) => {
    setData((prev) => ({ ...prev, accounts }))

    const addresses: string[] = []
    // proceed sequencially in case mnemonic must be added to the store on first call
    for (const { name, suri, curve } of accounts)
      addresses.push(await api.accountCreateFromSuri(name, suri, curve))

    return addresses
  }, [])

  return { data, updateData, importAccounts, onSuccess }
}

export const [AccountAddMnemonicProvider, useAccountAddSecret] = provideContext(
  useAccountAddMnemonicProvider,
)
