import { getChainflipApiKey, parseChainflipChannelId } from "@common/chainflip"
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

export async function fetchSimpleswapStatus(
  exchangeId: string,
  env: SwapStatusEnv
): Promise<SwapStatus> {
  const { simpleswapApiKey } = await env.getSwapsConfig()
  if (!simpleswapApiKey) throw new Error("SimpleSwap API key not found")

  const params = new URLSearchParams({ api_key: simpleswapApiKey, id: exchangeId })
  const res = await env.fetch(`https://api.simpleswap.io/get_exchange?${params}`)
  if (!res.ok) throw new Error(`SimpleSwap API error: ${res.status}`)

  const data: { status: string } = await res.json()
  return data.status as SwapStatus
}

export async function fetchStealthexStatus(
  exchangeId: string,
  env: SwapStatusEnv
): Promise<SwapStatus> {
  const res = await env.proxyFetch(`https://stealthex.talisman.xyz/v4/exchanges/${exchangeId}`)
  if (!res.ok) throw new Error(`StealthEX API error: ${res.status}`)

  const data: { status: string } = await res.json()
  return data.status as SwapStatus
}

// Chainflip states, in order: waiting -> receiving -> swapping -> sending -> sent -> completed,
// or failed. Nothing maps to "unknown": that is the watcher's give-up value and a swap sitting
// on it is abandoned after an hour.
const CHAINFLIP_STATUS_MAP: Record<string, SwapStatus> = {
  waiting: "waiting",
  receiving: "confirming",
  swapping: "exchanging",
  sending: "sending",
  sent: "sending",
  completed: "finished",
}

export async function fetchChainflipStatus(
  exchangeId: string,
  env: SwapStatusEnv
): Promise<SwapStatus> {
  const channel = parseChainflipChannelId(exchangeId)
  if (!channel) throw new Error(`Malformed Chainflip deposit channel: ${exchangeId}`)

  const params = new URLSearchParams({
    apiKey: getChainflipApiKey(),
    issuedBlock: channel.issuedBlock.toString(),
    // The display name, echoed back exactly as the deposit channel returned it.
    network: channel.network,
    channelId: channel.channelId.toString(),
  })
  const res = await env.fetch(`https://chainflip-broker.io/status-by-deposit-channel?${params}`)

  // The row does not exist until the deposit is witnessed. Their watcher gives not_found a
  // 10 minute grace period, which is exactly this window.
  if (res.status === 404) return "not_found"
  // Anything else throws, so the retry loop applies rather than persisting a bogus status.
  if (!res.ok) throw new Error(`Chainflip API error: ${res.status}`)

  const data: {
    status?: { state?: string; swapEgress?: unknown; refundEgress?: unknown }
  } = await res.json()
  const state = data.status?.state
  const refunded = !!data.status?.refundEgress

  // A refund is not a failure — it is a swap that gave the funds back, and their SwapStatus
  // union already has a word for that.
  if (state === "failed") return refunded ? "refunded" : "failed"
  // A refunded swap also ends as completed. With no output at all it was refunded in full; with
  // an output too it is a partly filled DCA swap, which delivered, so it counts as finished.
  if (state === "completed" && refunded && !data.status?.swapEgress) return "refunded"

  const status = state ? CHAINFLIP_STATUS_MAP[state] : undefined
  if (!status) throw new Error(`Unexpected Chainflip swap state: ${state}`)
  return status
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
