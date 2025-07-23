import { assert } from "@polkadot/util"
import { AccountPlatform } from "@talismn/crypto"
import { AddAccountExternalOptions } from "extension-core"
import { useCallback, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useNetworkById } from "@ui/state"

export type LedgerAccountDefSubstrate = Extract<
  AddAccountExternalOptions,
  { type: "ledger-polkadot" }
>
export type LedgerAccountDefEthereum = Extract<
  AddAccountExternalOptions,
  { type: "ledger-ethereum" }
>
export type LedgerAccountDefSolana = Extract<AddAccountExternalOptions, { type: "ledger-solana" }>

export type LedgerAccountDef =
  | LedgerAccountDefSubstrate
  | LedgerAccountDefEthereum
  | LedgerAccountDefSolana

export enum AddSubstrateLedgerAppType {
  Legacy = "Legacy",
  Generic = "Generic",
  Migration = "Migration",
}

type LedgerCreationInputs = {
  platform: AccountPlatform
  substrateAppType: AddSubstrateLedgerAppType
  accounts: LedgerAccountDef[]
  chainId?: string
}

const useAddLedgerAccountProvider = ({ onSuccess }: { onSuccess: (address: string) => void }) => {
  const [params] = useSearchParams()
  const [data, setData] = useState<Partial<LedgerCreationInputs>>(() => ({
    platform: params.get("platform") as AccountPlatform | undefined,
  }))
  const chain = useNetworkById(data.chainId as string, "polkadot")

  const updateData = useCallback((newData: Partial<LedgerCreationInputs>) => {
    setData((prev) => ({
      ...prev,
      ...newData,
    }))
  }, [])

  const connectAccounts = useCallback(
    (accounts: LedgerAccountDef[]) => {
      if (data.platform === "polkadot") {
        assert(data.substrateAppType, "Substrate app type is required")

        if (data.substrateAppType === AddSubstrateLedgerAppType.Legacy)
          assert(
            accounts.every((acc) => {
              const genesisHash = "genesisHash" in acc ? acc.genesisHash || undefined : undefined
              return !!genesisHash && genesisHash === chain?.genesisHash
            }),
            "Chain mismatch",
          )
      }

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
