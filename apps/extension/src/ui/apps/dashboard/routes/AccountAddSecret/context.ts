import { DEBUG } from "@core/constants"
import { AccountAddressType, RequestAccountCreateFromSeed } from "@core/domains/accounts/types"
import { sleep } from "@core/util/sleep"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useState } from "react"
import { useLocation, useParams, useSearchParams } from "react-router-dom"

type AccountAddSecretInputs = {
  name: string
  type: AccountAddressType
  multi: boolean
  mnemonic: string
  accounts: RequestAccountCreateFromSeed[]
}

const useAccountAddSecretProvider = () => {
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

    await Promise.all(
      accounts.map(({ name, seed, type }) => api.accountCreateFromSeed(name, seed, type))
    )

    // poudre de perlimpinpin
    await sleep(1000)
  }, [])

  return { data, updateData, importAccounts }
}

export const [AccountAddSecretProvider, useAccountAddSecret] = provideContext(
  useAccountAddSecretProvider
)
