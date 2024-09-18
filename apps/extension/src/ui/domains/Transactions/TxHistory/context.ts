import { HexString } from "@polkadot/util/types"
import { useLiveQuery } from "dexie-react-hooks"
import { db, EvmNetworkId, WalletTransaction } from "extension-core"
import { useCallback, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useAccounts from "@ui/hooks/useAccounts"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"

type UseTxHistoryProviderProps = {
  address?: string
}

const useTxHistoryProvider = ({ address: initialAddress }: UseTxHistoryProviderProps) => {
  const [includeTestnets] = useSetting("useTestnets")

  const accounts = useAccounts("owned")
  const { evmNetworks, evmNetworksMap } = useEvmNetworks({ activeOnly: true, includeTestnets })
  const { chains } = useChains({ activeOnly: true, includeTestnets })
  const chainsByGenesisHash = useMemo(
    () => Object.fromEntries(chains.map((chain) => [chain.genesisHash, chain])),
    [chains]
  )

  const allTransactions = useLiveQuery(async () => {
    const txs = await db.transactions.toArray()
    return txs.sort((tx1, tx2) => tx2.timestamp - tx1.timestamp)
  }, [])

  const [{ address, networkId }, setState] = useState<{
    address: string | null
    networkId: HexString | EvmNetworkId | null
  }>({
    networkId: null,
    address: initialAddress ?? null,
  })

  //   const [genesisHash, evmNetworkId] = useMemo(
  //     () => [
  //       networkId && chainsByGenesisHash[networkId] ? networkId : null,
  //       networkId && evmNetworksMap[networkId] ? networkId : null,
  //     ],
  //     [networkId, chainsByGenesisHash, evmNetworksMap]
  //   )

  const account = useAccountByAddress(address)

  const network = useMemo(
    () => chainsByGenesisHash[networkId ?? ""] ?? evmNetworksMap[networkId ?? ""] ?? null,
    [chainsByGenesisHash, evmNetworksMap, networkId]
  )

  const transactions = useMemo(
    () => getTransactions(address, networkId, allTransactions),
    [address, allTransactions, networkId]
  )

  const setAddress = useCallback(
    (address: string) => {
      setState((state) => {
        // reset network if no txs found for this address
        const txs = getTransactions(address, state.networkId, allTransactions)
        return { address, networkId: txs.length ? state.networkId : null }
      })
    },
    [allTransactions]
  )

  const setNetworkId = useCallback(
    (networkId: HexString | EvmNetworkId) => setState((state) => ({ ...state, networkId })),
    []
  )

  return {
    network,
    account,
    accounts,
    evmNetworks,
    chains,
    transactions,
    setAddress,
    setNetworkId,
  }
}

export const [TxHistoryProvider, useTxHistory] = provideContext(useTxHistoryProvider)

const getTransactions = (
  address: string | null,
  networkId: HexString | EvmNetworkId | null,
  allTransactions: WalletTransaction[] | undefined
) => {
  return (
    allTransactions
      ?.filter((tx) => !address || tx.account === address)
      .filter((tx) => !networkId || (tx.networkType === "evm" && tx.evmNetworkId === networkId))
      .filter(
        (tx) => !networkId || (tx.networkType === "substrate" && tx.genesisHash === networkId)
      ) ?? []
  )
}
