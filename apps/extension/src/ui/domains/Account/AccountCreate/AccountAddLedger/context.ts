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
import { useSearchParams } from "react-router-dom"

export type LedgerAccountDefSubstrate = Omit<RequestAccountCreateHardware, "hardwareType">
export type LedgerAccountDefEthereum = RequestAccountCreateHardwareEthereum
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
            ? await api.accountCreateHardware(account)
            : await api.accountCreateHardwareEthereum(account.name, account.address, account.path)
        )

      return addresses
    },
    [chain?.genesisHash, data.type]
  )

  return { data, updateData, importAccounts, onSuccess }
}

export const [AddLedgerAccountProvider, useAddLedgerAccount] = provideContext(
  useAddLedgerAccountProvider
)
