import { networkIdFromTokenId } from "@talismn/chaindata-provider"
import type { RemoteConfigStoreData } from "../app/types"
import type { SwapStatus, WalletTransactionInfo } from "../transactions/types"

const LIFI_API_URL = "https://lifi.talisman.xyz/v1"

export type SwapStatusEnv = {
  fetch: typeof fetch
  /** a fetch that carries the Gandalf token the Talisman API proxies require */
  proxyFetch: typeof fetch
  getSwapsConfig: () => Promise<RemoteConfigStoreData["swaps"]>
}

/**
 * The exchange statuses SimpleSwap's `get_exchange` and StealthEX's `/v4/exchanges/{id}` document.
 * Both name them the same.
 */
const EXCHANGE_STATUSES: Record<string, SwapStatus> = {
  waiting: "waiting",
  confirming: "confirming",
  exchanging: "exchanging",
  sending: "sending",
  verifying: "verifying",
  finished: "finished",
  failed: "failed",
  refunded: "refunded",
  expired: "expired",
}

/**
 * The swap status of an exchange response. A status outside {@link EXCHANGE_STATUSES} is
 * "unknown": stored as received it would never count as final, and its watcher would poll for
 * good. A response with no status is an error, so the watcher asks again.
 */
const toExchangeStatus = (data: unknown, provider: string): SwapStatus => {
  const status = (data as { status?: unknown } | null)?.status
  if (typeof status !== "string" || !status) throw new Error(`${provider} API returned no status`)
  return Object.hasOwn(EXCHANGE_STATUSES, status) ? EXCHANGE_STATUSES[status] : "unknown"
}

export async function fetchSimpleswapStatus(
  exchangeId: string,
  env: SwapStatusEnv
): Promise<SwapStatus> {
  const { simpleswapApiKey } = await env.getSwapsConfig()
  if (!simpleswapApiKey) throw new Error("SimpleSwap API key not found")

  const params = new URLSearchParams({ api_key: simpleswapApiKey, id: exchangeId })
  const res = await env.fetch(`https://api.simpleswap.io/get_exchange?${params}`)
  if (!res.ok) throw new Error(`SimpleSwap API error: ${res.status}`)

  return toExchangeStatus(await res.json(), "SimpleSwap")
}

export async function fetchStealthexStatus(
  exchangeId: string,
  env: SwapStatusEnv
): Promise<SwapStatus> {
  const res = await env.proxyFetch(`https://stealthex.talisman.xyz/v4/exchanges/${exchangeId}`)
  if (!res.ok) throw new Error(`StealthEX API error: ${res.status}`)

  return toExchangeStatus(await res.json(), "StealthEX")
}

const LIFI_STATUS_MAP: Record<string, SwapStatus> = {
  NOT_FOUND: "not_found",
  INVALID: "invalid",
  PENDING: "exchanging",
  DONE: "finished",
  FAILED: "failed",
}

export async function fetchLifiStatus(
  txId: string,
  txInfo: Extract<WalletTransactionInfo, { type: "swap-lifi" }>,
  env: SwapStatusEnv
): Promise<SwapStatus> {
  const fromNetworkId = networkIdFromTokenId(txInfo.fromTokenId)
  const toNetworkId = networkIdFromTokenId(txInfo.toTokenId)

  const fromChain = await toLifiChainId(fromNetworkId, env)
  const toChain = await toLifiChainId(toNetworkId, env)

  // txId is the on-chain transaction hash (the DB primary key)
  const params = new URLSearchParams({ txHash: txId })
  if (fromChain !== undefined) params.set("fromChain", String(fromChain))
  if (toChain !== undefined) params.set("toChain", String(toChain))

  const res = await env.proxyFetch(`${LIFI_API_URL}/status?${params}`)
  if (!res.ok) throw new Error(`LiFi API error: ${res.status}`)

  const data: { status: string } = await res.json()
  return LIFI_STATUS_MAP[data.status] ?? "unknown"
}

async function toLifiChainId(networkId: string, env: SwapStatusEnv): Promise<number | undefined> {
  if (networkId === "solana-mainnet") {
    const { lifi } = await env.getSwapsConfig()
    return lifi.solanaChainId
  }
  const num = Number(networkId)
  return Number.isFinite(num) ? num : undefined
}
