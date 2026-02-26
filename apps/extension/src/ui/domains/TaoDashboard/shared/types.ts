import type { TokenId } from "@talismn/chaindata-provider"
import type { Prettify } from "@talismn/util"

type TransactionEntryBase = {
  hash: string
  account: string
  direction: "buy" | "sell"

  tokenIdIn: TokenId
  tokenIdOut: TokenId
  tokenValueIn: bigint
  tokenValueOut: bigint
}

export type LocalTransactionEntry = Prettify<
  TransactionEntryBase & {
    status: "pending" | "finalizing" | "confirmed" | "failed"
    hotkey: string
    timestamp: number // unix timestamp in ms
    blockHeight: number | undefined
  }
>

export type IndexedTransactionEntry = Prettify<
  TransactionEntryBase & {
    status: "indexed"
    hotkey: string
    timestamp: string
    blockHeight: number
  }
>

export type TransactionEntry = LocalTransactionEntry | IndexedTransactionEntry

export type TimePeriod = "1d" | "1w" | "1m"
