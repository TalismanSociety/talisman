import { assert } from "@polkadot/util"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useChain from "@ui/hooks/useChain"
import {
  AccountAddressType,
  RequestAccountCreateLedgerEthereum,
  RequestAccountCreateLedgerSubstrate,
} from "extension-core"
import { AssetDiscoveryMode } from "extension-core"
import { useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"

export type LedgerAccountDefSubstrate = RequestAccountCreateLedgerSubstrate
export type LedgerAccountDefEthereum = RequestAccountCreateLedgerEthereum
export type LedgerAccountDef = LedgerAccountDefSubstrate | LedgerAccountDefEthereum

type LedgerCreationInputs = {
  type: AccountAddressType
  chainId?: string
  accounts: LedgerAccountDef[]
}

const useAddLedgerAccountProvider = ({ onSuccess }: { onSuccess: (address: string) => void }) => {
  const [params] = useSearchParams()
  const [data, setData] = useState<Partial<LedgerCreationInputs>>(() => ({
    type: params.get("type") as AccountAddressType,
  }))
  const chain = useChain(data.chainId as string)

  const updateData = useCallback((newData: Partial<LedgerCreationInputs>) => {
    setData((prev) => ({
      ...prev,
      ...newData,
    }))
  }, [])

  const importAccounts = useCallback(
    async (accounts: LedgerAccountDef[]) => {
      if (data.type === "sr25519")
        assert(
          accounts.every((acc) => "path" in acc || acc.genesisHash === chain?.genesisHash),
          "Chain mismatch"
        )

      setData((prev) => ({ ...prev, accounts }))

      const addresses: string[] = []
      for (const account of accounts)
        addresses.push(
          "genesisHash" in account
            ? await api.accountCreateLedger(account)
            : await api.accountCreateLedgerEthereum(account.name, account.address, account.path)
        )

      api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, addresses)

      return addresses
    },
    [chain?.genesisHash, data.type]
  )

  return { data, updateData, importAccounts, onSuccess }
}

export const [AddLedgerAccountProvider, useAddLedgerAccount] = provideContext(
  useAddLedgerAccountProvider
)
