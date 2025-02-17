import { KeypairCurve } from "@talismn/crypto"
import { getEthDerivationPath, RequestAccountCreateFromSuri } from "extension-core"
import { DEBUG } from "extension-shared"
import { useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"

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

const DEBUG_MNEMONIC = "test test test test test test test test test test test junk"

const useAccountAddMnemonicProvider = ({ onSuccess }: { onSuccess: (address: string) => void }) => {
  const [params] = useSearchParams()

  const [data, setData] = useState<Partial<AccountAddSecretInputs>>(() => ({
    curve: params.get("curve") as KeypairCurve,
    mode: "first",
    mnemonic: DEBUG ? DEBUG_MNEMONIC : undefined,
    derivationPath: params.get("platform") === "ethereum" ? getEthDerivationPath() : "",
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
