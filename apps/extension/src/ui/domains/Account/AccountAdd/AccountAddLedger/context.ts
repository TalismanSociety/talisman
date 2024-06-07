import {
  AccountAddressType,
  RequestAccountCreateLedgerEthereum,
  RequestAccountCreateLedgerSubstrate,
  RequestAccountCreateLedgerSubstrateGeneric,
  RequestAccountCreateLedgerSubstrateLegacy,
  RequestAccountCreateLedgerSubstrateMigration,
  SubstrateLedgerAppType,
} from "@extension/core"
import { AssetDiscoveryMode } from "@extension/core"
import { assert } from "@polkadot/util"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useChain from "@ui/hooks/useChain"
import { useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"

export type LedgerAccountDefSubstrateGeneric = RequestAccountCreateLedgerSubstrateGeneric
export type LedgerAccountDefSubstrateLegacy = RequestAccountCreateLedgerSubstrateLegacy
export type LedgerAccountDefSubstrateMigration = RequestAccountCreateLedgerSubstrateMigration

export type LedgerAccountDefSubstrate = RequestAccountCreateLedgerSubstrate
export type LedgerAccountDefEthereum = RequestAccountCreateLedgerEthereum
export type LedgerAccountDef = LedgerAccountDefSubstrate | LedgerAccountDefEthereum

type LedgerCreationInputs = {
  type: AccountAddressType
  chainId?: string
  substrateAppType: SubstrateLedgerAppType
  accounts: LedgerAccountDef[]
}

const createAccount = (account: LedgerAccountDef, substrateAppType?: SubstrateLedgerAppType) => {
  if (substrateAppType) {
    return api.accountCreateLedgerSubstrate(account as LedgerAccountDefSubstrate)
  } else {
    // assume ethereum
    const { name, address, path } = account as LedgerAccountDefEthereum
    return api.accountCreateLedgerEthereum(name, address, path)
  }
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
      if (data.substrateAppType === "substrate-legacy")
        assert(
          accounts.every((acc) => "genesisHash" in acc && acc.genesisHash === chain?.genesisHash),
          "Chain mismatch"
        )

      setData((prev) => ({ ...prev, accounts }))

      const addresses: string[] = []
      for (const account of accounts)
        addresses.push(await createAccount(account, data.substrateAppType))

      api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, addresses)

      return addresses
    },
    [chain?.genesisHash, data.substrateAppType]
  )

  return { data, updateData, importAccounts, onSuccess }
}

export const [AddLedgerAccountProvider, useAddLedgerAccount] = provideContext(
  useAddLedgerAccountProvider
)
