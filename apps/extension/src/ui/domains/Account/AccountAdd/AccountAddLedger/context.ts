import { assert } from "@polkadot/util"
import { Platform } from "@talismn/crypto"
import { AddAccountExternalOptions } from "extension-core"
import { useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useChain } from "@ui/state"

export type LedgerAccountDefSubstrate = Extract<
  AddAccountExternalOptions,
  { type: "ledger-polkadot" }
>
export type LedgerAccountDefEthereum = Extract<
  AddAccountExternalOptions,
  { type: "ledger-ethereum" }
>
export type LedgerAccountDef = LedgerAccountDefSubstrate | LedgerAccountDefEthereum

export enum AddSubstrateLedgerAppType {
  Legacy = "Legacy",
  Generic = "Generic",
  Migration = "Migration",
}

type LedgerCreationInputs = {
  platform: Platform
  substrateAppType: AddSubstrateLedgerAppType
  accounts: LedgerAccountDef[]
  chainId?: string
}

const useAddLedgerAccountProvider = ({ onSuccess }: { onSuccess: (address: string) => void }) => {
  const [params] = useSearchParams()
  const [data, setData] = useState<Partial<LedgerCreationInputs>>(() => ({
    platform: params.get("platform") as Platform | undefined,
  }))
  const chain = useChain(data.chainId as string)

  const updateData = useCallback((newData: Partial<LedgerCreationInputs>) => {
    setData((prev) => ({
      ...prev,
      ...newData,
    }))
  }, [])

  const connectAccounts = useCallback(
    (accounts: LedgerAccountDef[]) => {
      if (data.platform !== "ethereum")
        assert(data.substrateAppType, "Substrate app type is required")

      if (data.substrateAppType === AddSubstrateLedgerAppType.Legacy)
        assert(
          accounts.every((acc) => {
            const genesisHash = "genesisHash" in acc ? acc.genesisHash || undefined : undefined
            return !!genesisHash && genesisHash === chain?.genesisHash
          }),
          "Chain mismatch",
        )

      setData((prev) => ({ ...prev, accounts }))

      return api.accountAddExternal(accounts)
    },
    [chain?.genesisHash, data.substrateAppType, data.platform],
  )

  return { data, updateData, connectAccounts, onSuccess }
}

export const [AddLedgerAccountProvider, useAddLedgerAccount] = provideContext(
  useAddLedgerAccountProvider,
)
