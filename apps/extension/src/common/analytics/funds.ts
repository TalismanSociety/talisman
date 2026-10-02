import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import {
  isNetworkKnown,
  isTokenCustom,
  type Network,
  networkIdFromTokenId,
  type Token,
} from "@talismn/chaindata-provider"
import { detectAddressEncoding } from "@talismn/crypto"

import { symbolForAnalytics } from "./schema"
import { CUSTOM_NETWORK_ID } from "./transactions"

export const SEND_ENTRIES = [
  "dashboard",
  "nav_menu",
  "token_details",
  "address_book",
  "unknown",
] as const
export type SendEntry = (typeof SEND_ENTRIES)[number]

export const SWAP_ENTRIES = ["dashboard", "nav_menu", "get_started", "seek"] as const
export type SwapEntry = (typeof SWAP_ENTRIES)[number]

export const BUY_ENTRIES = [
  "dashboard",
  "nav_menu",
  "get_started",
  "no_tokens",
  "token_details",
] as const
export type BuyEntry = (typeof BUY_ENTRIES)[number]

export const RECEIVE_ENTRIES = [
  "dashboard",
  "account_header",
  "account_menu",
  "account_icon",
  "token_details",
  "get_started",
  "no_tokens",
  "address_book",
  "copy_toast",
] as const
export type ReceiveEntry = (typeof RECEIVE_ENTRIES)[number]

export const RECIPIENT_SOURCES = [
  "own_account",
  "watched_account",
  "contact",
  "typed",
  "name_service",
  "prefilled",
  "unknown",
] as const
export type RecipientSource = (typeof RECIPIENT_SOURCES)[number]

export const SWAP_PROTOCOLS = [
  "simpleswap",
  "stealthex",
  "lifi",
  "bittensor-evm",
  "forevermoney",
] as const
export type SwapProtocol = (typeof SWAP_PROTOCOLS)[number]

export const SWAP_OUTCOMES = [
  "finished",
  "failed",
  "expired",
  "refunded",
  "invalid",
  "unknown",
] as const
export type SwapOutcome = (typeof SWAP_OUTCOMES)[number]

export const FEE_PRIORITIES = ["low", "medium", "high", "recommended", "custom"] as const
export const GAS_TYPES = ["eip1559", "legacy"] as const
export const RAMP_PROVIDERS = ["coinbase", "ramp"] as const
export const RAMP_DIRECTIONS = ["buy", "sell"] as const
export const REPLACE_TYPES = ["speed_up", "cancel"] as const
export const TX_PHASES = ["pre_broadcast", "approval", "submit"] as const

export const savedNetworkId = (
  network: { id: string; platform: string },
  known: boolean
): string => (known || network.platform === "ethereum" ? network.id : CUSTOM_NETWORK_ID)

export const networkIdForAnalytics = (network: Network | null | undefined): string =>
  network ? savedNetworkId(network, isNetworkKnown(network)) : CUSTOM_NETWORK_ID

export const tokenSymbolForAnalytics = (token: Token | null | undefined): string =>
  token && !isTokenCustom(token) ? symbolForAnalytics(token.symbol) : "unknown"

export const copiedNetworkId = (network: Network | null | undefined): string =>
  network ? networkIdForAnalytics(network) : "generic"

export const addressFormatOf = (address: string, legacy = false): string => {
  const format = legacy ? "legacy" : "standard"
  try {
    return `${detectAddressEncoding(address)}:${format}`
  } catch {
    return `unknown:${format}`
  }
}

const SWAP_TX_PROTOCOLS: Partial<Record<WalletTransactionInfo["type"], SwapProtocol>> = {
  "swap-simpleswap": "simpleswap",
  "swap-stealthex": "stealthex",
  "swap-lifi": "lifi",
  "swap-bittensor-evm": "bittensor-evm",
  "swap-forevermoney": "forevermoney",
}

export const swapOfTransaction = (
  txInfo: WalletTransactionInfo | undefined
): { protocol: SwapProtocol; cross_chain: boolean } | null => {
  const protocol = txInfo && SWAP_TX_PROTOCOLS[txInfo.type]
  if (!protocol || !txInfo || !("fromTokenId" in txInfo) || !("toTokenId" in txInfo)) return null
  return { protocol, cross_chain: isCrossChain(txInfo.fromTokenId, txInfo.toTokenId) }
}

const isCrossChain = (fromTokenId: string, toTokenId: string): boolean => {
  try {
    return networkIdFromTokenId(fromTokenId) !== networkIdFromTokenId(toTokenId)
  } catch {
    return false
  }
}
