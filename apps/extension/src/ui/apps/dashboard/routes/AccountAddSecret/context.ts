import { DEBUG } from "@core/constants"
import { AccountAddressType, RequestAccountCreateFromSeed } from "@core/domains/accounts/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useState } from "react"

type AccountAddSecretInputs = {
  name: string
  type: AccountAddressType
  multi: boolean
  mnemonic: string
  accounts: RequestAccountCreateFromSeed[]
}

const DEFAULT_DATA: Partial<AccountAddSecretInputs> = {
  // uncomment to be able to F5 on accounts selection screen when developing
  mnemonic: DEBUG ? process.env.TEST_MNEMONIC : undefined,
}

const useAccountAddSecretProvider = () => {
  const [data, setData] = useState<Partial<AccountAddSecretInputs>>(DEFAULT_DATA)

  const updateData = useCallback((newData: Partial<AccountAddSecretInputs>) => {
    setData((prev) => ({
      ...prev,
      ...newData,
    }))
  }, [])

  const importAccounts = useCallback(async (accounts: RequestAccountCreateFromSeed[]) => {
    setData((prev) => ({ ...prev, accounts }))

    await Promise.all(
      accounts.map(({ name, seed, type }) => api.accountCreateFromSeed(name, seed, type))
    )

    // poudre de perlimpinpin
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }, [])

  return { data, updateData, importAccounts }
}

export const [AccountAddSecretProvider, useAccountAddSecret] = provideContext(
  useAccountAddSecretProvider
)
