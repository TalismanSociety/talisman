import { HexString } from "@polkadot/util/types"
import { EthNetworkId, Network } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/util"
import { WalletTransaction } from "extension-core"
import { log } from "extension-shared"
import uniq from "lodash-es/uniq"
import { useCallback, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import { useAccountByAddress, useAccounts, useNetworks, useTransactions } from "@ui/state"

const useTxHistoryProvider = () => {
  const accounts = useAccounts("owned")
  const allNetworks = useNetworks()

  const allTransactions = useTransactions()

  const [{ addresses, networkId }, setState] = useState<{
    addresses: string[] | null
    networkId: HexString | EthNetworkId | null
  }>({
    addresses: null,
    networkId: null,
  })

  const encodedAddresses = useMemo(() => addresses?.map(normalizeAddress) ?? [], [addresses])

  const networks = useMemo(() => {
    const accountTransactions = allTransactions?.filter(
      (tx) => !encodedAddresses.length || encodedAddresses.includes(normalizeAddress(tx.account)),
    )

    const networkIds = uniq(
      accountTransactions.filter((tx) => tx.networkType === "evm").map((tx) => tx.evmNetworkId),
    )
    const genesisHashes = uniq(
      accountTransactions
        .filter((tx) => tx.networkType === "substrate")
        .map((tx) => tx.genesisHash),
    )

    return allNetworks.filter((network) => {
      switch (network.platform) {
        case "ethereum":
          return networkIds.includes(network.id)
        case "polkadot":
          return genesisHashes.includes(network.genesisHash)
        default:
          log.warn("Unsupported network platform")
          return false
      }
    })
  }, [allTransactions, allNetworks, encodedAddresses])

  const network = useMemo<Network | null>(
    () => networks.find((n) => n.id === networkId) ?? null,
    [networkId, networks],
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
    (networkId: HexString | EthNetworkId | null) => setState((state) => ({ ...state, networkId })),
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
  networkId: HexString | EthNetworkId | null,
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
