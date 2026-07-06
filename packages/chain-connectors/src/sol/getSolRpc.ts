import type { Rpc, RpcTransport, SolanaRpcApi } from "@solana/kit"
import { createDefaultRpcTransport, createSolanaRpcFromTransport, isSolanaError } from "@solana/kit"
import type { SolNetworkId } from "@talismn/chaindata-provider"

export type SolRpc = Rpc<SolanaRpcApi>

// Public Solana RPC nodes rate-limit aggressively with HTTP 429. kit's default transport is
// single-shot, unlike the old web3.js `Connection` which retried 429 up to 5x with backoff, so a
// single 429 would fail an otherwise-valid request (e.g. a user's transaction submission, or token
// discovery silently returning no tokens). This wrapper restores that behaviour.
const MAX_429_RETRIES = 5
const BASE_BACKOFF_MS = 500

/** Returns the delay to wait before retrying, or `null` if the error is not a retryable 429. */
const get429RetryDelay = (error: unknown, attempt: number): number | null => {
  if (!isSolanaError(error)) return null

  const context = error.context as { statusCode?: number; headers?: Headers }
  if (context.statusCode !== 429) return null

  // honour the server's Retry-After header (delta-seconds) when present
  const retryAfter = Number(context.headers?.get("retry-after"))
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000

  // otherwise exponential backoff: 500ms, 1s, 2s, 4s, 8s
  return BASE_BACKOFF_MS * 2 ** attempt
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)

    const onAbort = () => {
      clearTimeout(timeout)
      reject(signal?.reason)
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    signal?.addEventListener("abort", onAbort, { once: true })
  })

/**
 * Wraps a transport so HTTP 429 responses are retried with backoff. Solana RPC requests are
 * idempotent (`sendTransaction` is keyed by signature), so replaying a rate-limited request is safe.
 */
const withRetryOn429 = (transport: RpcTransport): RpcTransport => {
  const wrapped = async (config: Parameters<RpcTransport>[0]) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await transport(config)
      } catch (error) {
        const delay = attempt < MAX_429_RETRIES ? get429RetryDelay(error, attempt) : null
        if (delay === null) throw error
        await sleep(delay, config.signal)
      }
    }
  }
  return wrapped as RpcTransport
}

// TODO leverage multiple rpcs with fallback
export const getSolTransport = (_networkId: SolNetworkId, rpcs: string[]): RpcTransport =>
  withRetryOn429(createDefaultRpcTransport({ url: rpcs[0] }))

export const getSolRpc = (networkId: SolNetworkId, rpcs: string[]): SolRpc =>
  createSolanaRpcFromTransport(getSolTransport(networkId, rpcs))
