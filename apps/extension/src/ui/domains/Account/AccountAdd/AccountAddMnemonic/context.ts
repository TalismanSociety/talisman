import { useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"

import {
  AssetDiscoveryMode,
  getEthDerivationPath,
  RequestAccountCreateFromSuri,
  UiAccountAddressType,
} from "@extension/core"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"

export type AccountAddDerivationMode = "first" | "custom" | "multi"

type AccountAddSecretInputs = {
  name: string
  type: UiAccountAddressType
  mode: AccountAddDerivationMode
  mnemonic: string
  derivationPath: string
  accounts: RequestAccountCreateFromSuri[]
}

const useAccountAddMnemonicProvider = ({ onSuccess }: { onSuccess: (address: string) => void }) => {
  const [params] = useSearchParams()
  const [data, setData] = useState<Partial<AccountAddSecretInputs>>(() => ({
    type: params.get("type") as UiAccountAddressType,
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

export const [AccountAddMnemonicProvider, useAccountAddSecret] = provideContext(
  useAccountAddMnemonicProvider,
)
