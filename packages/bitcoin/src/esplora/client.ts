import type {
  BtcApi,
  BtcFeeEstimates,
  EsploraAddressStats,
  EsploraTxStatus,
  EsploraUtxo,
} from "./types"

class EsploraRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// abort a stalled request so it fails over / errors instead of hanging a caller forever
const REQUEST_TIMEOUT_MS = 10_000

/**
 * Esplora REST client with multi-url failover.
 * `urls` are esplora API bases including the /api segment,
 * e.g. https://mempool.space/api or https://blockstream.info/api
 */
export const createEsploraClient = (urls: string[]): BtcApi => {
  if (!urls.length) throw new Error("createEsploraClient requires at least one url")

  // sticky index: keep using the url that works, advance on network/server errors
  let currentUrlIndex = 0

  // remember per base whether the mempool.space fees endpoint is available
  const hasMempoolFees = new Map<string, boolean>()

  const request = async <T>(path: string, init?: RequestInit, parse?: "text"): Promise<T> => {
    let lastError: unknown
    for (let attempt = 0; attempt < urls.length; attempt++) {
      const base = urls[(currentUrlIndex + attempt) % urls.length]
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      try {
        const response = await fetch(`${base}${path}`, { ...init, signal: controller.signal })
        if (!response.ok) {
          const body = await response.text().catch(() => "")
          const error = new EsploraRequestError(response.status, body || response.statusText)
          // 4xx (except 429) are deterministic — the other servers would answer the same
          if (response.status < 500 && response.status !== 429) throw error
          lastError = error
          // back off before hitting the next endpoint so a rate-limit doesn't tight-loop
          if (attempt < urls.length - 1) await sleep(500 * (attempt + 1))
          continue
        }
        currentUrlIndex = (currentUrlIndex + attempt) % urls.length
        return (parse === "text" ? await response.text() : await response.json()) as T
      } catch (err) {
        if (err instanceof EsploraRequestError && err.status < 500 && err.status !== 429) throw err
        lastError = err
        if (attempt < urls.length - 1) await sleep(500 * (attempt + 1))
      } finally {
        clearTimeout(timeout)
      }
    }
    throw lastError instanceof Error ? lastError : new Error("All esplora endpoints failed")
  }

  const getFeeEstimates = async (): Promise<BtcFeeEstimates> => {
    const base = urls[currentUrlIndex]

    // mempool.space flavor first: purpose-built recommendation endpoint
    if (hasMempoolFees.get(base) !== false) {
      try {
        const fees = await request<{
          fastestFee: number
          halfHourFee: number
          hourFee: number
          economyFee: number
          minimumFee: number
        }>("/v1/fees/recommended")
        hasMempoolFees.set(base, true)
        return {
          fastest: fees.fastestFee,
          halfHour: fees.halfHourFee,
          hour: fees.hourFee,
          economy: fees.economyFee,
          minimum: fees.minimumFee,
        }
      } catch {
        hasMempoolFees.set(base, false)
      }
    }

    // vanilla esplora fallback: confirmation-target → sat/vB map
    const estimates = await request<Record<string, number>>("/fee-estimates")
    const target = (blocks: number) => Math.max(estimates[String(blocks)] ?? 1, 1)
    return {
      fastest: target(1),
      halfHour: target(3),
      hour: target(6),
      economy: target(144),
      minimum: target(1008),
    }
  }

  return {
    getTipHeight: () => request<number>("/blocks/tip/height"),
    getAddressStats: (address) => request<EsploraAddressStats>(`/address/${address}`),
    getAddressUtxos: (address) => request<EsploraUtxo[]>(`/address/${address}/utxo`),
    getTxStatus: (txid) => request<EsploraTxStatus>(`/tx/${txid}/status`),
    getTxHex: (txid) => request<string>(`/tx/${txid}/hex`, undefined, "text"),
    getFeeEstimates,
    broadcastTx: (txHex) => request<string>("/tx", { method: "POST", body: txHex }, "text"),
  }
}
