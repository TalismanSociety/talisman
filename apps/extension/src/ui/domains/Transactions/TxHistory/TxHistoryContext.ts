import { HexString } from "@polkadot/util/types"
import { encodeAnyAddress } from "@talismn/util"
import { useLiveQuery } from "dexie-react-hooks"
import { Chain, db, EvmNetwork, EvmNetworkId, WalletTransaction } from "extension-core"
import uniq from "lodash/uniq"
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
  const { evmNetworksMap } = useEvmNetworks({ activeOnly: true, includeTestnets })
  const { chains } = useChains({ activeOnly: true, includeTestnets })
  const chainsByGenesisHash = useMemo(
    () =>
      Object.fromEntries(chains.map((chain) => [chain.genesisHash, chain])) as Partial<
        Record<HexString, Chain>
      >,
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

  const networks = useMemo(() => {
    const accountTransactions = allTransactions?.filter(
      (tx) => !address || encodeAnyAddress(tx.account) === encodeAnyAddress(address)
    )

    const evmNetworks = uniq(
      accountTransactions?.map((tx) => (tx.networkType === "evm" ? tx.evmNetworkId : null))
    )
      .filter((evmNetworkId): evmNetworkId is string => !!evmNetworkId)
      .map((evmNetworkId) => evmNetworksMap[evmNetworkId])
      .filter<EvmNetwork>((n): n is EvmNetwork => !!n)

    const chains = uniq(
      accountTransactions?.map((tx) => (tx.networkType === "substrate" ? tx.genesisHash : null))
    )
      .filter((genesisHash): genesisHash is HexString => !!genesisHash)
      .map((genesisHash) => chainsByGenesisHash[genesisHash])
      .filter<Chain>((n): n is Chain => !!n)

    return [...evmNetworks, ...chains].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
  }, [address, allTransactions, chainsByGenesisHash, evmNetworksMap])

  const network = useMemo<Chain | EvmNetwork | null>(
    () =>
      chainsByGenesisHash[(networkId ?? "") as HexString] ??
      evmNetworksMap[networkId ?? ""] ??
      null,
    [chainsByGenesisHash, evmNetworksMap, networkId]
  )

  const transactions = useMemo(
    () => getTransactions(address, networkId, allTransactions),
    [address, allTransactions, networkId]
  )

  const setAddress = useCallback(
    (address: string | null) => {
      setState((state) => {
        // reset network if no txs found for this address
        const txs = getTransactions(address, state.networkId, allTransactions)
        return { address, networkId: txs.length ? state.networkId : null }
      })
    },
    [allTransactions]
  )

  const setNetworkId = useCallback(
    (networkId: HexString | EvmNetworkId | null) => setState((state) => ({ ...state, networkId })),
    []
  )

  const account = useAccountByAddress(address)

  return {
    isLoading: !allTransactions,
    network,
    networks,
    account,
    accounts,
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
      ?.filter((tx) => !address || encodeAnyAddress(tx.account) === encodeAnyAddress(address))
      .filter(
        (tx) =>
          !networkId ||
          (tx.networkType === "evm" && tx.evmNetworkId === networkId) ||
          (tx.networkType === "substrate" && tx.genesisHash === networkId)
      ) ?? []
  )
}
