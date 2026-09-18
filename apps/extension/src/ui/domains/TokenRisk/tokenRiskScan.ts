import { BLOCKAID_API_URL } from "@common/constants"
import { log } from "@common/log"
import { isTokenInTypes, type Token } from "@talismn/chaindata-provider"
import { queryOptions } from "@tanstack/react-query"
import { gandalfFetch } from "@ui/util/gandalfFetch"
import { z } from "zod/v4"

import { BLOCKAID_CHAIN_BY_NETWORK_ID } from "./blockaidChains"

const MAX_TOKENS_PER_REQUEST = 100
const REQUEST_TIMEOUT_MS = 10_000
const STALE_TIME_MS = 5 * 60_000
const UNKNOWN_STALE_TIME_MS = 10_000
const PENDING_REFETCH_INTERVAL_MS = 8_000
const MAX_PENDING_REFETCHES = 3
const GC_TIME_MS = 30 * 60_000

export type TokenRiskVerdict = "Benign" | "Warning" | "Malicious" | "Spam" | "unknown"
export type TokenRiskRef = { chain: string; address: string }
export type TokenRiskFeature = { id: string; type: string; description: string }
type TokenRiskFees = { buy?: number; sell?: number; transfer?: number }
type TokenRiskFinancialStats = {
  holdersCount?: number
  totalReserveInUsd?: number
  lockedLiquidityPercentage?: number
}
export type TokenRiskScan = {
  verdict: TokenRiskVerdict
  features: TokenRiskFeature[]
  fees: TokenRiskFees
  financialStats: TokenRiskFinancialStats
  isScanPending?: boolean
}

export const UNKNOWN_TOKEN_RISK: TokenRiskScan = {
  verdict: "unknown",
  features: [],
  fees: {},
  financialStats: {},
}

const featureSchema = z.object({ id: z.string(), type: z.string(), description: z.string() })
const resultSchema = z.object({
  status: z.enum(["hit", "miss", "error", "unsupported"]),
  resultType: z.enum(["Benign", "Warning", "Malicious", "Spam"]).optional(),
  features: z.array(featureSchema).optional(),
  fees: z
    .object({
      buy: z.number().optional(),
      sell: z.number().optional(),
      transfer: z.number().optional(),
    })
    .optional(),
  financialStats: z
    .object({
      holdersCount: z.number().optional(),
      totalReserveInUsd: z.number().optional(),
      lockedLiquidityPercentage: z.number().optional(),
    })
    .optional(),
})
const responseSchema = z.object({ results: z.record(z.string(), resultSchema) })

type ScanResult = z.infer<typeof resultSchema>

export const getTokenRiskRef = (token: Token | null | undefined): TokenRiskRef | null => {
  if (!token) return null
  const chain = BLOCKAID_CHAIN_BY_NETWORK_ID[token.networkId]
  if (!chain) return null
  if (isTokenInTypes(token, ["evm-erc20", "evm-uniswapv2"]))
    return { chain, address: token.contractAddress.toLowerCase() }
  if (isTokenInTypes(token, ["sol-spl", "sol-token2022"]))
    return { chain, address: token.mintAddress }
  return null
}

const getTokenRiskKey = ({ chain, address }: TokenRiskRef) => `${chain}:${address}`

const toTokenRiskScan = (result: ScanResult | undefined): TokenRiskScan => {
  if (result?.status === "miss") return { ...UNKNOWN_TOKEN_RISK, isScanPending: true }
  if (result?.status !== "hit" || !result.resultType) return UNKNOWN_TOKEN_RISK
  return {
    verdict: result.resultType,
    features: result.features ?? [],
    fees: result.fees ?? {},
    financialStats: result.financialStats ?? {},
  }
}

type PendingScan = { ref: TokenRiskRef; resolve: (scan: TokenRiskScan) => void }

let queue: PendingScan[] = []
let isFlushScheduled = false

const sendBatch = async (batch: PendingScan[]) => {
  const pendingByKey = new Map<string, PendingScan[]>()
  for (const pending of batch) {
    const key = getTokenRiskKey(pending.ref)
    pendingByKey.set(key, [...(pendingByKey.get(key) ?? []), pending])
  }

  const tokens = [...pendingByKey.values()].map(([first]) => first.ref)
  let results: Record<string, ScanResult> = {}
  try {
    const response = await gandalfFetch(`${BLOCKAID_API_URL}/token/scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokens }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`Token scan failed with status ${response.status}`)
    results = responseSchema.parse(await response.json()).results
  } catch (err) {
    log.warn("Token risk scan failed", { count: tokens.length, err })
  }

  for (const [key, pendings] of pendingByKey) {
    const scan = toTokenRiskScan(results[key])
    for (const pending of pendings) pending.resolve(scan)
  }
}

const flushQueue = () => {
  isFlushScheduled = false
  const batch = queue
  queue = []
  for (let i = 0; i < batch.length; i += MAX_TOKENS_PER_REQUEST)
    sendBatch(batch.slice(i, i + MAX_TOKENS_PER_REQUEST))
}

export const fetchTokenRiskScan = (ref: TokenRiskRef) =>
  new Promise<TokenRiskScan>((resolve) => {
    queue.push({ ref, resolve })
    if (isFlushScheduled) return
    isFlushScheduled = true
    setTimeout(flushQueue, 0)
  })

export const tokenRiskScanQueryOptions = (ref: TokenRiskRef | null) =>
  queryOptions({
    queryKey: ["token-risk-scan", ref?.chain, ref?.address],
    queryFn: () => (ref ? fetchTokenRiskScan(ref) : UNKNOWN_TOKEN_RISK),
    enabled: !!ref,
    staleTime: ({ state }) =>
      state.data?.verdict === "unknown" ? UNKNOWN_STALE_TIME_MS : STALE_TIME_MS,
    refetchInterval: ({ state }) =>
      state.data?.isScanPending && state.dataUpdateCount <= MAX_PENDING_REFETCHES
        ? PENDING_REFETCH_INTERVAL_MS
        : false,
    gcTime: GC_TIME_MS,
    retry: false,
  })
