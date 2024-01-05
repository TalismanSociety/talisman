import { AccountAddressType, RequestAccountCreateFromSuri } from "@core/domains/accounts/types"
import { AssetDiscoveryMode } from "@core/domains/assetDiscovery/types"
import { getEthDerivationPath } from "@core/domains/ethereum/helpers"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"

export type AccountAddDerivationMode = "first" | "custom" | "multi"

type AccountAddSecretInputs = {
  name: string
  type: AccountAddressType
  mode: AccountAddDerivationMode
  mnemonic: string
  derivationPath: string
  accounts: RequestAccountCreateFromSuri[]
}

const useAccountAddSecretProvider = ({ onSuccess }: { onSuccess: (address: string) => void }) => {
  const [params] = useSearchParams()
  const [data, setData] = useState<Partial<AccountAddSecretInputs>>(() => ({
    type: params.get("type") as AccountAddressType,
    mode: "first",
    derivationPath: params.get("type") === "ethereum" ? getEthDerivationPath() : "",
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
    for (const { name, suri, type } of accounts)
      addresses.push(await api.accountCreateFromSuri(name, suri, type))

    api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, addresses)

    return addresses
  }, [])

  return { data, updateData, importAccounts, onSuccess }
}

export const [AccountAddSecretProvider, useAccountAddSecret] = provideContext(
  useAccountAddSecretProvider
)
