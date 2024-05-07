import {
  AccountAddressType,
  RequestAccountCreateLedgerEthereum,
  RequestAccountCreateLedgerPolkadot,
  RequestAccountCreateLedgerSubstrateGeneric,
  RequestAccountCreateLedgerSubstrateLegacy,
  SubstrateLedgerAppType,
} from "@extension/core"
import { AssetDiscoveryMode } from "@extension/core"
import { assert } from "@polkadot/util"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useChain from "@ui/hooks/useChain"
import { useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"

export type LedgerAccountDefSubstrateLegacy = RequestAccountCreateLedgerSubstrateLegacy
export type LedgerAccountDefSubstrateGeneric = RequestAccountCreateLedgerSubstrateGeneric
export type LedgerAccountDefPolkadot = RequestAccountCreateLedgerPolkadot
export type LedgerAccountDefEthereum = RequestAccountCreateLedgerEthereum
export type LedgerAccountDef =
  | LedgerAccountDefSubstrateLegacy
  | LedgerAccountDefPolkadot
  | LedgerAccountDefEthereum
  | LedgerAccountDefSubstrateGeneric

type LedgerCreationInputs = {
  type: AccountAddressType
  chainId?: string
  substrateAppType: SubstrateLedgerAppType
  accounts: LedgerAccountDef[]
}

const createAccount = (
  account: LedgerAccountDef,
  type?: AccountAddressType,
  substrateAppType?: SubstrateLedgerAppType
) => {
  if (type === "sr25519") {
    if (substrateAppType === "polkadot") {
      const { name, address, path } = account as LedgerAccountDefPolkadot
      return api.accountCreateLedgerPolkadot(name, address, path)
    } else if (substrateAppType === "substrate-legacy") {
      return api.accountCreateLedgerSubstrateLegacy(account as LedgerAccountDefSubstrateLegacy)
    } else {
      throw new Error("Invalid or missing app type")
    }
  } else if (type === "ethereum") {
    const { name, address, path } = account as LedgerAccountDefEthereum
    return api.accountCreateLedgerEthereum(name, address, path)
  } else {
    throw new Error("Invalid or missing account type")
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
      if (data.type === "sr25519" && data.substrateAppType === "substrate-legacy")
        assert(
          accounts.every(
            (acc) =>
              "path" in acc || ("genesisHash" in acc && acc.genesisHash === chain?.genesisHash)
          ),
          "Chain mismatch"
        )

      setData((prev) => ({ ...prev, accounts }))

      const addresses: string[] = []
      for (const account of accounts)
        addresses.push(await createAccount(account, data.type, data.substrateAppType))

      api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, addresses)

      return addresses
    },
    [chain?.genesisHash, data.substrateAppType, data.type]
  )

  return { data, updateData, importAccounts, onSuccess }
}

export const [AddLedgerAccountProvider, useAddLedgerAccount] = provideContext(
  useAddLedgerAccountProvider
)
