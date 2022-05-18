import { RequestAccountCreateHardware } from "@polkadot/extension-base/background/types"
import { assert } from "@polkadot/util"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useChain from "@ui/hooks/useChain"
import { useCallback, useState } from "react"

export type LedgerAccountDef = Omit<RequestAccountCreateHardware, "hardwareType">

type LedgerCreationInputs = {
  chainId: string
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
      assert(
        accounts.every((acc) => acc.genesisHash === chain?.genesisHash),
        "Chain mismatch"
      )

      setData((prev) => ({ ...prev, accounts }))

      for (let account of accounts) await api.accountCreateHardware(account)
    },
    [chain]
  )

  return { data, updateData, importAccounts }
}

export const [AddLedgerAccountProvider, useAddLedgerAccount] = provideContext(
  useAddLedgerAccountProvider
)
