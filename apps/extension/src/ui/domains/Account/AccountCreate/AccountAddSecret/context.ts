import { AccountAddressType, RequestAccountCreateFromSeed } from "@core/domains/accounts/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"

type AccountAddSecretInputs = {
  name: string
  type: AccountAddressType
  multi: boolean
  mnemonic: string
  accounts: RequestAccountCreateFromSeed[]
}

const useAccountAddSecretProvider = ({ onSuccess }: { onSuccess: (address: string) => void }) => {
  const [params] = useSearchParams()
  const [data, setData] = useState<Partial<AccountAddSecretInputs>>(() => ({
    type: params.get("type") as AccountAddressType,
  }))

  const updateData = useCallback((newData: Partial<AccountAddSecretInputs>) => {
    setData((prev) => ({
      ...prev,
      ...newData,
    }))
  }, [])

  const importAccounts = useCallback(async (accounts: RequestAccountCreateFromSeed[]) => {
    setData((prev) => ({ ...prev, accounts }))

    const addresses: string[] = []
    // proceed sequencially in case mnemonic must be added to the store on first call
    for (const { name, seed, type } of accounts)
      addresses.push(await api.accountCreateFromSeed(name, seed, type))

    return addresses
  }, [])

  return { data, updateData, importAccounts, onSuccess }
}

export const [AccountAddSecretProvider, useAccountAddSecret] = provideContext(
  useAccountAddSecretProvider
)
