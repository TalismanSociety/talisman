import { networkIdFromTokenId } from "@talismn/chaindata-provider"
import type { SwapStatus, WalletTransactionInfo } from "../transactions/types"
import type { SwapEnv } from "./env"

export const LIFI_API_URL = "https://lifi.talisman.xyz/v1"

export type SwapStatusEnv = Pick<SwapEnv, "fetch" | "proxyFetch" | "getSwapsConfig">

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
