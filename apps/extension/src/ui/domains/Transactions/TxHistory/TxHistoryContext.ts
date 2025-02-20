import { HexString } from "@polkadot/util/types"
import { normalizeAddress } from "@talismn/util"
import { Chain, EvmNetwork, EvmNetworkId, WalletTransaction } from "extension-core"
import uniq from "lodash/uniq"
import { useCallback, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import {
  useAccountByAddress,
  useAccounts,
  useChains,
  useEvmNetworksMap,
  useSettingValue,
  useTransactions,
} from "@ui/state"

const useTxHistoryProvider = () => {
  const includeTestnets = useSettingValue("useTestnets")

  const accounts = useAccounts("owned")
  const evmNetworksMap = useEvmNetworksMap({ activeOnly: true, includeTestnets })
  const chains = useChains({ activeOnly: true, includeTestnets })
  const chainsByGenesisHash = useMemo(
    () =>
      Object.fromEntries(chains.map((chain) => [chain.genesisHash, chain])) as Partial<
        Record<HexString, Chain>
      >,
    [chains],
  )

  const allTransactions = useTransactions()

  const [{ addresses, networkId }, setState] = useState<{
    addresses: string[] | null
    networkId: HexString | EvmNetworkId | null
  }>({
    addresses: null,
    networkId: null,
  })

  const encodedAddresses = useMemo(() => addresses?.map(normalizeAddress) ?? [], [addresses])

  const networks = useMemo(() => {
    const accountTransactions = allTransactions?.filter(
      (tx) => !encodedAddresses.length || encodedAddresses.includes(normalizeAddress(tx.account)),
    )

    const evmNetworks = uniq(
      accountTransactions?.map((tx) => (tx.networkType === "evm" ? tx.evmNetworkId : null)),
    )
      .filter((evmNetworkId): evmNetworkId is string => !!evmNetworkId)
      .map((evmNetworkId) => evmNetworksMap[evmNetworkId])
      .filter<EvmNetwork>((n): n is EvmNetwork => !!n)

    const chains = uniq(
      accountTransactions?.map((tx) => (tx.networkType === "substrate" ? tx.genesisHash : null)),
    )
      .filter((genesisHash): genesisHash is HexString => !!genesisHash)
      .map((genesisHash) => chainsByGenesisHash[genesisHash])
      .filter<Chain>((n): n is Chain => !!n)

    return [...evmNetworks, ...chains].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
  }, [encodedAddresses, allTransactions, chainsByGenesisHash, evmNetworksMap])

  const network = useMemo<Chain | EvmNetwork | null>(
    () =>
      chainsByGenesisHash[(networkId ?? "") as HexString] ??
      evmNetworksMap[networkId ?? ""] ??
      null,
    [chainsByGenesisHash, evmNetworksMap, networkId],
  )

  const transactions = useMemo(
    () => getTransactions(encodedAddresses, networkId, allTransactions),
    [encodedAddresses, allTransactions, networkId],
  )

  const setAddress = useCallback(
    (addresses: string[] | null) => {
      setState((state) => {
        // reset network if no txs found for this address
        const txs = getTransactions(addresses, state.networkId, allTransactions)
        return { addresses, networkId: txs.length ? state.networkId : null }
      })
    },
    [allTransactions],
  )

  const setNetworkId = useCallback(
    (networkId: HexString | EvmNetworkId | null) => setState((state) => ({ ...state, networkId })),
    [],
  )

  // only for popup, where we can only select 1 account
  const account = useAccountByAddress(addresses?.length === 1 ? addresses[0] : null)

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
  addresses: string[] | null,
  networkId: HexString | EvmNetworkId | null,
  allTransactions: WalletTransaction[] | undefined,
) => {
  const encodedAddresses = addresses?.map(normalizeAddress) ?? []

  return (
    allTransactions
      ?.filter(
        (tx) => !encodedAddresses.length || encodedAddresses.includes(normalizeAddress(tx.account)),
      )
      .filter(
        (tx) =>
          !networkId ||
          (tx.networkType === "evm" && tx.evmNetworkId === networkId) ||
          (tx.networkType === "substrate" && tx.genesisHash === networkId),
      ) ?? []
  )
}
