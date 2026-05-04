import { log } from "@common/log"
import type { DotNetwork, NetworkId } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"
import { throwAfter } from "@talismn/util"

import { getMetadataDef } from "../../util/getMetadataDef"
import { addressToAccountId } from "../assetDiscovery/substrate"
import { getMetadataRpcFromDef } from "../metadata/helpers"
import type { AccountProxyEntry, AccountProxySet } from "./types"

const PROBE_TIMEOUT_MS = 15_000

type QueryStorageChange = [key: `0x${string}`, value: `0x${string}` | null]
type QueryStorageResultItem = { block: `0x${string}`; changes: QueryStorageChange[] }

/**
 * One-shot WebSocket `state_queryStorageAt`. Modelled on
 * `assetDiscovery/substrate.ts`. Avoids holding the shared chain connector open
 * across many chains during 5-min polls.
 */
const probeRpc = async (
  rpcUrl: string,
  storageKeys: `0x${string}`[],
  signal: AbortSignal
): Promise<QueryStorageResultItem> =>
  new Promise<QueryStorageResultItem>((resolve, reject) => {
    let socket: WebSocket | null = null
    let settled = false

    const cleanup = () => {
      if (socket) {
        try {
          socket.close(1000)
        } catch {
          // ignore
        }
        socket = null
      }
      signal.removeEventListener("abort", onAbort)
    }
    const done = (result: QueryStorageResultItem) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }
    const fail = (err: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err instanceof Error ? err : new Error(String(err)))
    }
    const onAbort = () => fail(new Error("Aborted"))

    if (signal.aborted) return fail(new Error("Aborted"))
    signal.addEventListener("abort", onAbort, { once: true })

    try {
      socket = new WebSocket(rpcUrl)
    } catch (err) {
      return fail(err)
    }

    socket.onopen = () => {
      try {
        socket?.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "state_queryStorageAt",
            params: [storageKeys],
          })
        )
      } catch (err) {
        fail(err)
      }
    }
    socket.onerror = (ev) =>
      fail(new Error(`WebSocket error on ${rpcUrl}: ${(ev as ErrorEvent)?.message ?? "unknown"}`))
    socket.onclose = () => {
      if (!settled) fail(new Error(`WebSocket closed before receiving a response from ${rpcUrl}`))
    }
    socket.onmessage = (ev) => {
      try {
        const payload = JSON.parse(typeof ev.data === "string" ? ev.data : "")
        if (payload?.id !== 1) return
        if (payload.error) {
          fail(new Error(`RPC error: ${payload.error.message ?? JSON.stringify(payload.error)}`))
          return
        }
        const result = Array.isArray(payload.result) ? payload.result[0] : payload.result
        if (!result || !Array.isArray(result.changes)) {
          fail(new Error("Unexpected state_queryStorageAt response shape"))
          return
        }
        done(result as QueryStorageResultItem)
      } catch (err) {
        fail(err)
      }
    }
  })

const probeNetworkRpcs = async (
  rpcs: string[],
  storageKeys: `0x${string}`[],
  signal: AbortSignal
): Promise<QueryStorageResultItem> => {
  let lastErr: unknown
  for (const rpc of rpcs) {
    if (signal.aborted) throw new Error("Aborted")
    const perRpcAbort = new AbortController()
    const onOuterAbort = () => perRpcAbort.abort()
    signal.addEventListener("abort", onOuterAbort, { once: true })
    try {
      return await Promise.race([
        probeRpc(rpc, storageKeys, perRpcAbort.signal),
        throwAfter(PROBE_TIMEOUT_MS, "Timeout"),
      ])
    } catch (err) {
      lastErr = err
      log.debug("[accountProxies] probe failed on", rpc, err)
    } finally {
      perRpcAbort.abort()
      signal.removeEventListener("abort", onOuterAbort)
    }
  }
  throw lastErr ?? new Error("No RPCs available")
}

/** A decoded raw `Proxy.Proxies(...)` storage value. */
type DecodedProxiesValue = {
  deposit: bigint
  proxies: AccountProxyEntry[]
}

/** Reasonably stringify whatever shape the codec produces for `proxy_type`. */
const stringifyProxyType = (raw: unknown): string => {
  if (raw == null) return "Unknown"
  if (typeof raw === "string") return raw
  if (typeof raw === "number" || typeof raw === "bigint") return String(raw)
  if (typeof raw === "object") {
    const obj = raw as { tag?: string; type?: string; value?: unknown }
    if (typeof obj.tag === "string") return obj.tag
    if (typeof obj.type === "string") return obj.type
  }
  return "Unknown"
}

/**
 * Decode a single `state_queryStorageAt` result row. Raw `null` (absent storage)
 * is treated as the runtime default `{ deposit: 0, proxies: [] }`.
 */
export const decodeProxiesValue = (
  rawValue: `0x${string}` | null,
  // biome-ignore lint/suspicious/noExplicitAny: dynamic codec
  storageCodec: any
): DecodedProxiesValue => {
  if (!rawValue) return { deposit: 0n, proxies: [] }

  // Decoded shape: [Array<{delegate, proxy_type, delay}>, bigint]
  const decoded = storageCodec.value.dec(rawValue) as [
    Array<{ delegate: unknown; proxy_type?: unknown; proxyType?: unknown; delay: unknown }>,
    bigint,
  ]

  const [rawProxies, deposit] = decoded
  const proxies: AccountProxyEntry[] = (rawProxies ?? []).map((row) => {
    const delegateRaw = row.delegate
    let delegate: string
    if (typeof delegateRaw === "string") {
      delegate = delegateRaw
    } else if (delegateRaw && typeof delegateRaw === "object" && "asText" in delegateRaw) {
      // FixedSizeBinary or AccountId object
      delegate = (delegateRaw as { asText: () => string }).asText()
    } else {
      delegate = String(delegateRaw)
    }
    return {
      delegate,
      proxyType: stringifyProxyType(row.proxyType ?? row.proxy_type),
      delay: BigInt(row.delay as number | bigint | string).toString(),
    }
  })

  return { deposit: BigInt(deposit), proxies }
}

export type ProxyPollCandidate = {
  network: DotNetwork
  /** Addresses of compatible accounts to query. */
  delegators: Array<{ address: string }>
}

export type ProxyPollOutcome =
  | { ok: true; networkId: NetworkId; sets: AccountProxySet[] }
  | { ok: false; networkId: NetworkId; error: unknown }

/**
 * Poll the `Proxy.Proxies` storage entry for every (delegator, network) tuple in
 * a single `state_queryStorageAt` request, then decode the result.
 */
export const pollNetworkProxies = async (
  candidate: ProxyPollCandidate,
  signal: AbortSignal
): Promise<ProxyPollOutcome> => {
  const { network, delegators } = candidate
  if (!Array.isArray(network.rpcs) || network.rpcs.length === 0) {
    return { ok: false, networkId: network.id, error: new Error("No RPC endpoints configured") }
  }
  if (delegators.length === 0) {
    return { ok: true, networkId: network.id, sets: [] }
  }

  try {
    const metadataDef = await getMetadataDef(network.id)
    if (!metadataDef) throw new Error("Metadata not available")
    const metadataRpc = getMetadataRpcFromDef(metadataDef)
    if (!metadataRpc) throw new Error("Metadata RPC not available")

    const { builder } = parseMetadataRpc(metadataRpc)
    const storageCodec = builder.buildStorage("Proxy", "Proxies")

    const keysByAddress = new Map<`0x${string}`, string>()
    for (const { address } of delegators) {
      try {
        const key = storageCodec.keys.enc(address) as `0x${string}`
        keysByAddress.set(key, address)
      } catch (err) {
        log.warn("[accountProxies] failed to build storage key", { network: network.id, err })
      }
    }
    const storageKeys = Array.from(keysByAddress.keys())
    if (!storageKeys.length) {
      return { ok: true, networkId: network.id, sets: [] }
    }

    const result = await probeNetworkRpcs(network.rpcs, storageKeys, signal)
    const valuesByKey = new Map(result.changes)

    const sets: AccountProxySet[] = []
    for (const [key, address] of keysByAddress.entries()) {
      const raw = valuesByKey.get(key) ?? null
      try {
        const { deposit, proxies } = decodeProxiesValue(raw, storageCodec)
        sets.push({
          delegator: address,
          networkId: network.id,
          deposit: deposit.toString(),
          isStale: false,
          proxies,
        })
      } catch (err) {
        // Decoding failure for one delegator shouldn't fail the whole network.
        log.warn("[accountProxies] failed to decode proxies value", {
          network: network.id,
          address,
          err,
        })
      }
    }
    return { ok: true, networkId: network.id, sets }
  } catch (err) {
    return { ok: false, networkId: network.id, error: err }
  }
}

/** Re-export so the observable can use the shared address conversion helper. */
export { addressToAccountId }
