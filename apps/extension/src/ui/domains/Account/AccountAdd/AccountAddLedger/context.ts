import { assert } from "@polkadot/util"
import { useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"

import {
  AccountAddressType,
  AssetDiscoveryMode,
  RequestAccountCreateLedgerEthereum,
  RequestAccountCreateLedgerSubstrate,
  RequestAccountCreateLedgerSubstrateGeneric,
  RequestAccountCreateLedgerSubstrateLegacy,
  SubstrateLedgerAppType,
} from "@extension/core"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useChain from "@ui/hooks/useChain"

export type LedgerAccountDefSubstrateGeneric = RequestAccountCreateLedgerSubstrateGeneric
export type LedgerAccountDefSubstrateLegacy = RequestAccountCreateLedgerSubstrateLegacy

export type LedgerAccountDefSubstrate = RequestAccountCreateLedgerSubstrate
export type LedgerAccountDefEthereum = RequestAccountCreateLedgerEthereum
export type LedgerAccountDef = LedgerAccountDefSubstrate | LedgerAccountDefEthereum

export enum AddSubstrateLedgerAppType {
  Legacy = "Legacy",
  Generic = "Generic",
  Migration = "Migration",
}

const getSubstrateLedgerAppType = (type: AddSubstrateLedgerAppType) => {
  switch (type) {
    case AddSubstrateLedgerAppType.Legacy:
      return SubstrateLedgerAppType.Legacy
    case AddSubstrateLedgerAppType.Generic:
    case AddSubstrateLedgerAppType.Migration:
      return SubstrateLedgerAppType.Generic
  }
}

type LedgerCreationInputs = {
  type: AccountAddressType
  substrateAppType: AddSubstrateLedgerAppType
  accounts: LedgerAccountDef[]
  chainId?: string
  migrationAppName?: string
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

  const connectAccounts = useCallback(
    async (accounts: LedgerAccountDef[]) => {
      if (data.type !== "ethereum") assert(data.substrateAppType, "Substrate app type is required")

      if (data.substrateAppType === AddSubstrateLedgerAppType.Legacy)
        assert(
          accounts.every((acc) => "genesisHash" in acc && acc.genesisHash === chain?.genesisHash),
          "Chain mismatch"
        )

      setData((prev) => ({ ...prev, accounts }))

      const addresses: string[] = []
      for (const account of accounts)
        addresses.push(
          await createAccount(
            account,
            data.substrateAppType ? getSubstrateLedgerAppType(data.substrateAppType) : undefined
          )
        )

      api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, addresses)

      return addresses
    },
    [chain?.genesisHash, data.substrateAppType, data.type]
  )

  return { data, updateData, connectAccounts, onSuccess }
}

export const [AddLedgerAccountProvider, useAddLedgerAccount] = provideContext(
  useAddLedgerAccountProvider
)
