import type { DevLog } from "./store.devLog"
import type { WireEvent } from "./types"

export type SendOutcome = "sent" | "drop" | "retry"

export type Transport = (batch: readonly WireEvent[]) => Promise<SendOutcome>

export const MAX_BATCH_SIZE = 50
const SEND_TIMEOUT_MS = 15_000

export const classifyResponseStatus = (status: number): SendOutcome => {
  if (status >= 200 && status < 300) return "sent"
  if (status === 408 || status === 429) return "retry"
  if (status >= 400 && status < 500) return "drop"
  return "retry"
}

export const createPosthogTransport =
  ({
    endpoint,
    apiKey,
    fetchImpl = fetch,
  }: {
    endpoint: string
    apiKey: string
    fetchImpl?: typeof fetch
  }): Transport =>
  async (batch) => {
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, historical_migration: false, batch }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      })
      return classifyResponseStatus(response.status)
    } catch {
      return "retry"
    }
  }

export const createDevLogTransport =
  (devLog: DevLog, clock: () => number): Transport =>
  async (batch) => {
    await devLog.markDelivered(
      batch.map((event) => event.uuid),
      clock()
    )
    return "sent"
  }

const BACKOFF_BASE_MS = 5_000
const BACKOFF_CAP_MS = 5 * 60_000

export const nextBackoffMs = (failures: number) =>
  failures <= 0 ? 0 : Math.min(BACKOFF_BASE_MS * 2 ** (failures - 1), BACKOFF_CAP_MS)
