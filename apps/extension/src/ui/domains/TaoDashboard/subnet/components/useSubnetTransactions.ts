import type { WalletTransactionDot, WalletTransactionInfo } from "@core"
import { parseTokenId, subDTaoTokenId, subNativeTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { useAccounts, useTransactions } from "@ui/state"
import { useEffect, useMemo, useRef } from "react"

import { useSubnetStakeEvents } from "../../hooks/useSn45Api"
import type { LocalTransactionEntry, TransactionEntry } from "../../shared/types"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import type { RealtimeStakeEvent } from "./realtime/types"

export const useSubnetTransactions = (
  netuid: number,
  ownedOnly: boolean,
  limit = 20,
  options?: {
    realtimeEvents?: RealtimeStakeEvent[]
    onIndexerBlockHeight?: (consumerId: string, blockHeight: number) => void
  }
) => {
  const accounts = useAccounts("owned")
  const ownedAddresses = useMemo(() => accounts.map((acc) => acc.address), [accounts])
  const { data: events, isLoading, error } = useSubnetStakeEvents(netuid)

  const relevantEvents = useMemo(() => {
    if (!ownedOnly) return events?.slice(0, limit) ?? []

    return (
      events
        ?.filter((event) => ownedAddresses.some((addr) => isAddressEqual(addr, event.coldkey)))
        .slice(0, limit) ?? []
    )
  }, [events, ownedOnly, ownedAddresses, limit])

  const indexedTransactions = useMemo<TransactionEntry[]>(() => {
    if (!relevantEvents) return []

    return relevantEvents.map((event) => {
      const isBuy = event.method === "Adding"

      return {
        hash: event.hash,
        account: event.coldkey,
        direction: isBuy ? "buy" : "sell",
        hotkey: event.hotkey,
        tokenIdIn: isBuy
          ? subNativeTokenId(BITTENSOR_NETWORK_ID)
          : subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid),
        tokenIdOut: isBuy
          ? subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid)
          : subNativeTokenId(BITTENSOR_NETWORK_ID),
        tokenValueIn: BigInt(isBuy ? event.taoAmount : event.alphaAmount),
        tokenValueOut: BigInt(isBuy ? event.alphaAmount : event.taoAmount),
        status: "indexed" as const,
        timestamp: event.timestamp,
        blockHeight: event.blockHeight,
      }
    })
  }, [relevantEvents, netuid])

  const localTransactions = useTransactions()
  const localStakingTransactions = useMemo(() => {
    return localTransactions
      .filter((tx): tx is WalletTransactionDot => {
        if (tx.platform !== "polkadot" || tx.networkId !== BITTENSOR_NETWORK_ID) return false
        if (!tx.txInfo || tx.txInfo.type !== "bittensor-staking") return false
        return [tx.txInfo.fromTokenId, tx.txInfo.toTokenId]
          .map(parseTokenId)
          .some((parsed) => parsed.type === "substrate-dtao" && parsed.netuid === netuid)
      })
      .map((tx): LocalTransactionEntry => {
        const txInfo = tx.txInfo as Extract<WalletTransactionInfo, { type: "bittensor-staking" }>
        const tokenIn = parseTokenId(txInfo.fromTokenId)
        const isBuy = tokenIn.type === "substrate-native"

        return {
          hash: tx.hash,
          account: tx.account,
          direction: isBuy ? "buy" : "sell",
          hotkey: txInfo.hotkey,
          tokenIdIn: txInfo.fromTokenId,
          tokenIdOut: txInfo.toTokenId,
          tokenValueIn: BigInt(txInfo.fromAmount),
          tokenValueOut: BigInt(txInfo.toAmount), // estimate for local txs
          status: mapLocalTxStatus(tx),
          timestamp: tx.timestamp,
          blockHeight: tx.blockNumber ? Number(tx.blockNumber) : undefined,
        }
      })
      .slice(0, limit)
  }, [netuid, localTransactions, limit])

  // Derive the highest indexed block height and notify the consumer for pruning
  const indexerBlockHeight = useMemo(() => {
    if (!events?.length) return null
    return Math.max(...events.map((e) => e.blockHeight))
  }, [events])

  const onIndexerBlockHeightRef = useRef(options?.onIndexerBlockHeight)
  onIndexerBlockHeightRef.current = options?.onIndexerBlockHeight

  useEffect(() => {
    if (indexerBlockHeight && onIndexerBlockHeightRef.current) {
      onIndexerBlockHeightRef.current("transactions", indexerBlockHeight)
    }
  }, [indexerBlockHeight])

  // Convert real-time events to TransactionEntry format, respecting ownedOnly filter
  const realtimeTransactions = useMemo<TransactionEntry[]>(() => {
    if (!options?.realtimeEvents?.length) return []

    const filtered = ownedOnly
      ? options.realtimeEvents.filter((evt) =>
          ownedAddresses.some((addr) => isAddressEqual(addr, evt.coldkey))
        )
      : options.realtimeEvents

    return filtered.map((evt): TransactionEntry => {
      const isBuy = evt.method === "Adding"

      return {
        hash: evt.hash,
        account: evt.coldkey,
        direction: isBuy ? "buy" : "sell",
        hotkey: evt.hotkey,
        tokenIdIn: isBuy
          ? subNativeTokenId(BITTENSOR_NETWORK_ID)
          : subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid),
        tokenIdOut: isBuy
          ? subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid)
          : subNativeTokenId(BITTENSOR_NETWORK_ID),
        tokenValueIn: isBuy ? evt.taoAmount : evt.alphaAmount,
        tokenValueOut: isBuy ? evt.alphaAmount : evt.taoAmount,
        status: "indexed" as const,
        timestamp: new Date(evt.timestamp).toISOString(),
        blockHeight: evt.blockHeight,
      }
    })
  }, [options?.realtimeEvents, netuid, ownedOnly, ownedAddresses])

  // Consolidated list of most recent transactions (local + indexed + realtime, deduplicated)
  // Priority: indexed (API) > realtime (block watcher) > local (pending)
  const data = useMemo<TransactionEntry[]>(() => {
    const indexedByHash = new Map(indexedTransactions.map((tx) => [tx.hash, tx]))

    // Exclude realtime txs already covered by indexed data
    const realtimeNotIndexed = realtimeTransactions.filter((tx) => !indexedByHash.has(tx.hash))
    const allIndexedAndRealtime = new Map([
      ...indexedByHash,
      ...realtimeNotIndexed.map((tx) => [tx.hash, tx] as const),
    ])

    // Exclude local txs that are already covered by indexed or realtime data
    const localNotYetCovered = localStakingTransactions.filter(
      (tx) => !allIndexedAndRealtime.has(tx.hash)
    )

    return [...localNotYetCovered, ...allIndexedAndRealtime.values()]
      .sort(compareTransactions)
      .slice(0, limit)
  }, [indexedTransactions, realtimeTransactions, localStakingTransactions, limit])

  return { data, isLoading, error }
}

/** Maps a local WalletTransactionDot status to our UI-friendly status */
const mapLocalTxStatus = (tx: WalletTransactionDot): LocalTransactionEntry["status"] => {
  if (tx.status === "error" || tx.status === "replaced") return "failed"
  if (tx.confirmed) return "confirmed"
  if (tx.blockNumber) return "finalizing"
  return "pending"
}

/** Sorts transactions: pending first, then by block height (desc), then by timestamp (desc) */
const compareTransactions = (a: TransactionEntry, b: TransactionEntry): number => {
  // Pending transactions always come first
  const aIsPending = a.status === "pending"
  const bIsPending = b.status === "pending"
  if (aIsPending !== bIsPending) return aIsPending ? -1 : 1

  // Sort by block height (highest first), undefined blocks come after defined ones
  if (a.blockHeight !== undefined && b.blockHeight !== undefined) {
    if (b.blockHeight !== a.blockHeight) return b.blockHeight - a.blockHeight
  } else if (a.blockHeight !== undefined) {
    return -1
  } else if (b.blockHeight !== undefined) {
    return 1
  }

  // Refine by timestamp (newest first)
  const aTime = a.status === "indexed" ? new Date(a.timestamp).getTime() : a.timestamp
  const bTime = b.status === "indexed" ? new Date(b.timestamp).getTime() : b.timestamp
  return bTime - aTime
}
