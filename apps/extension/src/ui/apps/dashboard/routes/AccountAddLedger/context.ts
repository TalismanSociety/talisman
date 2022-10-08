import {
  AccountAddressType,
  RequestAccountCreateHardwareEthereum,
} from "@core/domains/accounts/types"
import { RequestAccountCreateHardware } from "@polkadot/extension-base/background/types"
import { assert } from "@polkadot/util"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useChain from "@ui/hooks/useChain"
import { useCallback, useState } from "react"

export type LedgerAccountDefSubstrate = Omit<RequestAccountCreateHardware, "hardwareType">
export type LedgerAccountDefEthereum = RequestAccountCreateHardwareEthereum
export type LedgerAccountDef = LedgerAccountDefSubstrate | RequestAccountCreateHardwareEthereum

type LedgerCreationInputs = {
  type: AccountAddressType
  chainId?: string
  accounts: LedgerAccountDef[]
}

const DEFAULT_DATA = {
  // uncomment to be able to F5 on accounts selection screen when developing
  // chainId: DEBUG ? "polkadot" : undefined,
}

const useAddLedgerAccountProvider = () => {
  const [data, setData] = useState<Partial<LedgerCreationInputs>>(DEFAULT_DATA)
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

      for (const account of accounts)
        if ("genesisHash" in account) await api.accountCreateHardware(account)
        else await api.accountCreateHardwareEthereum(account.name, account.address, account.path)
    },
    [chain?.genesisHash, data.type]
  )

  return { data, updateData, importAccounts }
}

export const [AddLedgerAccountProvider, useAddLedgerAccount] = provideContext(
  useAddLedgerAccountProvider
)
