import type { Rpc, RpcTransport, SolanaRpcApi } from "@solana/kit"
import { createDefaultRpcTransport, createSolanaRpcFromTransport, isSolanaError } from "@solana/kit"
import type { SolNetworkId } from "@talismn/chaindata-provider"

import {
  genesisHashMatches,
  getIdentityVerdict,
  recordIdentityVerdict,
  withTimeout,
} from "../rpcIdentity"

export type SolRpc = Rpc<SolanaRpcApi>

// Public Solana RPC nodes rate-limit aggressively with HTTP 429. kit's default transport is
// single-shot, unlike the old web3.js `Connection` which retried 429 up to 5x with backoff, so a
// single 429 would fail an otherwise-valid request (e.g. a user's transaction submission, or token
// discovery silently returning no tokens). This wrapper restores that behaviour.
const MAX_429_RETRIES = 5
const BASE_BACKOFF_MS = 500

type HttpErrorContext = { statusCode?: number; headers?: Headers }

const getRateLimitContext = (error: unknown): HttpErrorContext | null => {
  if (!isSolanaError(error)) return null

  const context = error.context as HttpErrorContext
  return context.statusCode === 429 ? context : null
}

/** Returns the delay to wait before retrying, or `null` if the error is not a retryable 429. */
const get429RetryDelay = (error: unknown, attempt: number): number | null => {
  const context = getRateLimitContext(error)
  if (!context) return null

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

/**
 * How long a request may wait on an RPC before moving on to the next one. The last RPC tried gets
 * no timeout, so a slow but working node still answers when every other one has failed.
 */
const FAILOVER_TIMEOUT_MS = 20_000

const sendWithTimeout = async <TResponse>(
  transport: RpcTransport,
  config: RpcTransportConfig,
  timeoutMs: number
): Promise<TResponse> => {
  const controller = new AbortController()
  const onAbort = () => controller.abort(config.signal?.reason)
  config.signal?.addEventListener("abort", onAbort, { once: true })
  const timeout = setTimeout(
    () => controller.abort(new Error(`RPC request timed out after ${timeoutMs}ms`)),
    timeoutMs
  )

  try {
    return await transport<TResponse>({ ...config, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
    config.signal?.removeEventListener("abort", onAbort)
  }
}

type RpcTransportConfig = Parameters<RpcTransport>[0]

const isSendTransactionPayload = (
  payload: unknown
): payload is { method: "sendTransaction"; params: unknown[] } =>
  typeof payload === "object" &&
  payload !== null &&
  "method" in payload &&
  payload.method === "sendTransaction" &&
  "params" in payload &&
  Array.isArray(payload.params)

const withoutPreflight = (config: RpcTransportConfig): RpcTransportConfig => {
  if (!isSendTransactionPayload(config.payload)) return config

  const [transaction, sendConfig] = config.payload.params
  return {
    ...config,
    payload: {
      ...config.payload,
      params: [transaction, { ...(sendConfig as object | undefined), skipPreflight: true }],
    },
  }
}

export type SolTransportOptions = {
  /** Called with the url of the RPC that answered, after every successful request */
  onRpcSuccess?: (url: string) => void
  /**
   * The network's genesis hash. An RPC is sent nothing until it has answered `getGenesisHash`
   * with it, and is skipped when it serves another chain. Without one, the RPCs are used
   * unverified.
   */
  genesisHash?: string
}

/** How long the `getGenesisHash` probe of an RPC may take */
const IDENTITY_PROBE_TIMEOUT_MS = 5_000

/** In-flight probes, shared by every transport of the network */
const probes = new Map<string, Promise<boolean>>()

const GET_GENESIS_HASH = { jsonrpc: "2.0", id: 0, method: "getGenesisHash", params: [] }

/**
 * Whether the RPC serves the chain with `genesisHash`; throws when it could not be asked. The
 * verdict is kept for the process (see `rpcIdentity`), and concurrent requests share one probe.
 */
const servesChain = (
  networkId: string,
  genesisHash: string,
  url: string,
  transport: RpcTransport,
  signal: AbortSignal | undefined
): Promise<boolean> => {
  const verdict = getIdentityVerdict(networkId, url)
  if (verdict) return Promise.resolve(verdict === "match")

  const key = `${networkId}|${url}`
  let probe = probes.get(key)
  if (!probe) {
    probe = withTimeout(
      transport<{ result?: unknown }>({ payload: GET_GENESIS_HASH }),
      IDENTITY_PROBE_TIMEOUT_MS,
      `getGenesisHash ${url}`
    )
      .then((response) => {
        if (typeof response?.result !== "string")
          throw new Error(`RPC ${url} did not report a genesis hash`)
        const matches = genesisHashMatches(genesisHash, response.result)
        recordIdentityVerdict(networkId, url, matches ? "match" : "mismatch")
        return matches
      })
      .finally(() => probes.delete(key))
    probes.set(key, probe)
  }
  if (!signal) return probe

  // the probe is shared, so a caller's abort stops its own wait, not the probe
  return new Promise<boolean>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener("abort", onAbort, { once: true })
    probe.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort))
  })
}

/**
 * Sends each request to one RPC at a time, starting from the one that answered last, and moves on to
 * the next when the request fails. A transport only throws for connection, timeout and HTTP errors:
 * JSON-RPC errors come back in the response body and are returned as is.
 *
 * With a `genesisHash`, each RPC is asked for `getGenesisHash` before its first use. One of another
 * chain is skipped; one whose probe fails counts as failing this request and is probed again on its
 * next use.
 *
 * A failed RPC other than a rate limited one may still have forwarded a transaction. Resending it is
 * safe, as the network processes a signature once, but its preflight simulation on the next RPC
 * could then fail although it landed. So after such a failure, every resend of that transaction,
 * including the retries after a rate limit, skips preflight.
 */
const withFailover = (
  networkId: SolNetworkId,
  urls: string[],
  options: SolTransportOptions
): RpcTransport => {
  const transports = urls.map((url) => createDefaultRpcTransport({ url }))
  let preferred = 0
  const mayHaveBeenProcessed = new WeakSet<RpcTransportConfig>()

  const failover = async <TResponse>(config: RpcTransportConfig): Promise<TResponse> => {
    if (!transports.length) throw new Error("No RPCs found for Solana network")

    const start = preferred
    let lastError: unknown
    let rateLimitError: unknown
    for (let attempt = 0; attempt < transports.length; attempt++) {
      config.signal?.throwIfAborted()
      const index = (start + attempt) % transports.length
      const transport = transports[index] as RpcTransport
      const isLastAttempt = attempt === transports.length - 1
      const request = mayHaveBeenProcessed.has(config) ? withoutPreflight(config) : config

      // nothing has been sent to this RPC yet, so a failure here leaves preflight as it is
      if (options.genesisHash) {
        const url = urls[index] as string
        try {
          if (!(await servesChain(networkId, options.genesisHash, url, transport, config.signal))) {
            lastError = new Error(`RPC ${url} does not serve network ${networkId}`)
            continue
          }
        } catch (error) {
          if (config.signal?.aborted) throw error
          lastError = error
          if (getRateLimitContext(error)) rateLimitError ??= error
          continue
        }
      }

      try {
        const response = isLastAttempt
          ? await transport<TResponse>(request)
          : await sendWithTimeout<TResponse>(transport, request, FAILOVER_TIMEOUT_MS)
        preferred = index
        options.onRpcSuccess?.(urls[index] as string)
        return response
      } catch (error) {
        if (config.signal?.aborted) throw error
        lastError = error
        if (!getRateLimitContext(error)) mayHaveBeenProcessed.add(config)
        else rateLimitError ??= error
      }
    }
    throw rateLimitError ?? lastError
  }
  return failover as RpcTransport
}

/**
 * Returns a transport over all of the network's RPCs, in the given order. A request fails over to
 * the next RPC on error, and the RPC that answered is tried first for the next request. When every
 * RPC fails and one of them answered HTTP 429, the whole list is retried with backoff. With a
 * `genesisHash`, an RPC of another chain is skipped.
 */
export const getSolTransport = (
  networkId: SolNetworkId,
  rpcs: string[],
  options: SolTransportOptions = {}
): RpcTransport => {
  return withRetryOn429(withFailover(networkId, rpcs, options))
}

export const getSolRpc = (
  networkId: SolNetworkId,
  rpcs: string[],
  options?: SolTransportOptions
): SolRpc => createSolanaRpcFromTransport(getSolTransport(networkId, rpcs, options))
