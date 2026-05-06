import { log } from "@common/log"
import type { DotNetwork, NetworkId } from "@talismn/chaindata-provider"
import { encodeAddressSs58 } from "@talismn/crypto"
import { parseMetadataRpc } from "@talismn/scale"
import { throwAfter } from "@talismn/util"

import { chainConnector } from "../../rpcs/chain-connector"
import { getMetadataDef } from "../../util/getMetadataDef"
import { addressToAccountId } from "../assetDiscovery/substrate"
import { getMetadataRpcFromDef } from "../metadata/helpers"
import { decodeProxyCount, getProxyProxiesKey } from "./storageKeys"
import { setProxyPalletStatus } from "./store.proxyPalletCache"
import type { AccountProxyEntry, AccountProxySet } from "./types"

const RPC_TIMEOUT_MS = 15_000

type QueryStorageChange = [key: `0x${string}`, value: `0x${string}` | null]
type QueryStorageResultItem = { block: `0x${string}`; changes: QueryStorageChange[] }

/**
 * Query storage via the shared chain connector (already open for balances on active networks).
 * Wraps with a timeout and abort-signal check.
 */
const queryStorageAt = async (
  networkId: string,
  storageKeys: `0x${string}`[],
  signal: AbortSignal
): Promise<QueryStorageResultItem> => {
  if (signal.aborted) throw new Error("Aborted")

  const result = await Promise.race([
    chainConnector.send<QueryStorageResultItem[]>(networkId, "state_queryStorageAt", [storageKeys]),
    throwAfter(RPC_TIMEOUT_MS, "Timeout"),
  ])

  if (signal.aborted) throw new Error("Aborted")

  const item = Array.isArray(result) ? result[0] : result
  if (!item || !Array.isArray(item.changes)) {
    throw new Error("Unexpected state_queryStorageAt response shape")
  }
  return item
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
 * Convert a delegate field (as produced by the Proxy storage codec) to an SS58
 * address. polkadot-api decodes `AccountId32` as a `FixedSizeBinary` (raw
 * bytes), not as an SS58 string — calling `.asText()` on that would produce
 * UTF-8 garbage. Some metadata may resolve directly to a string; handle both.
 */
const decodeDelegate = (raw: unknown, ss58Format: number): string => {
  if (typeof raw === "string") return raw
  if (raw instanceof Uint8Array) return encodeAddressSs58(raw, ss58Format)
  if (raw && typeof raw === "object" && "asBytes" in raw && typeof raw.asBytes === "function")
    return encodeAddressSs58((raw as { asBytes: () => Uint8Array }).asBytes(), ss58Format)
  throw new Error(`Unrecognised delegate shape: ${typeof raw}`)
}

/**
 * Decode a single `state_queryStorageAt` result row. Raw `null` (absent storage)
 * is treated as the runtime default `{ deposit: 0, proxies: [] }`.
 */
export const decodeProxiesValue = (
  rawValue: `0x${string}` | null,
  // biome-ignore lint/suspicious/noExplicitAny: dynamic codec
  storageCodec: any,
  ss58Format: number
): DecodedProxiesValue => {
  if (!rawValue) return { deposit: 0n, proxies: [] }

  // Decoded shape: [Array<{delegate, proxy_type, delay}>, bigint]
  const decoded = storageCodec.value.dec(rawValue) as [
    Array<{ delegate: unknown; proxy_type?: unknown; proxyType?: unknown; delay: unknown }>,
    bigint,
  ]

  const [rawProxies, deposit] = decoded
  const proxies: AccountProxyEntry[] = (rawProxies ?? []).map((row) => ({
    delegate: decodeDelegate(row.delegate, ss58Format),
    proxyType: stringifyProxyType(row.proxyType ?? row.proxy_type),
    delay: BigInt(row.delay as number | bigint | string).toString(),
  }))

  return { deposit: BigInt(deposit), proxies }
}

export type ProxyPollCandidate = {
  network: DotNetwork
  /** Addresses of compatible accounts to query. */
  delegators: Array<{ address: string }>
}

export type LightweightProxyPollOutcome =
  | {
      ok: true
      networkId: NetworkId
      results: Array<{ address: string; proxyCount: number }>
      /** true when at least one delegator had proxies (pallet confirmed). */
      palletConfirmed: boolean
    }
  | { ok: false; networkId: NetworkId; error: unknown }

/**
 * Lightweight proxy poll: builds raw storage keys (no metadata), queries
 * `state_queryStorageAt`, and extracts proxy counts from the SCALE compact
 * prefix.
 *
 * Also updates the proxy pallet cache when the probe confirms pallet existence.
 */
export const pollNetworkProxiesLightweight = async (
  candidate: ProxyPollCandidate,
  signal: AbortSignal
): Promise<LightweightProxyPollOutcome> => {
  const { network, delegators } = candidate
  if (!Array.isArray(network.rpcs) || network.rpcs.length === 0) {
    return { ok: false, networkId: network.id, error: new Error("No RPC endpoints configured") }
  }
  if (delegators.length === 0) {
    return { ok: true, networkId: network.id, results: [], palletConfirmed: false }
  }

  try {
    const keysByAddress = new Map<`0x${string}`, string>()
    for (const { address } of delegators) {
      const accountId = addressToAccountId(address, network.account)
      if (!accountId) continue
      keysByAddress.set(getProxyProxiesKey(accountId), address)
    }

    const storageKeys = Array.from(keysByAddress.keys())
    if (!storageKeys.length) {
      return { ok: true, networkId: network.id, results: [], palletConfirmed: false }
    }

    const result = await queryStorageAt(network.id, storageKeys, signal)
    const valuesByKey = new Map(result.changes)

    let palletConfirmed = false
    const results: Array<{ address: string; proxyCount: number }> = []
    for (const [key, address] of keysByAddress.entries()) {
      const raw = valuesByKey.get(key) ?? null
      const proxyCount = decodeProxyCount(raw)
      if (raw !== null) palletConfirmed = true
      results.push({ address, proxyCount })
    }

    // The lightweight probe can confirm pallet *presence* (any non-null storage
    // result) but never pallet *absence* — `state_queryStorageAt` returns null
    // both when the pallet is missing and when it exists with no entries for
    // these accounts. Definitive negative caching happens via metadata
    // inspection in `loadNetworkProxyDetails` and `useProxyTypesForNetwork`.
    if (palletConfirmed && typeof network.specVersion === "number") {
      setProxyPalletStatus(network.id, network.specVersion, true)
    }

    return { ok: true, networkId: network.id, results, palletConfirmed }
  } catch (err) {
    return { ok: false, networkId: network.id, error: err }
  }
}

export type ProxyPollOutcome =
  | { ok: true; networkId: NetworkId; sets: AccountProxySet[] }
  | { ok: false; networkId: NetworkId; error: unknown }

/**
 * Full proxy decode: downloads metadata for one chain, builds storage codecs,
 * queries `state_queryStorageAt`, and decodes the full proxy entries including
 * types, delegates, delays and deposit.
 *
 * Used on-demand (when user opens proxy management forms) and after the wizard
 * submits a proxy transaction (refresh path).
 */
export const loadNetworkProxyDetails = async (
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

    // Definitive pallet check via metadata — cache the result
    let storageCodec: ReturnType<typeof builder.buildStorage>
    try {
      storageCodec = builder.buildStorage("Proxy", "Proxies")
      if (typeof network.specVersion === "number")
        setProxyPalletStatus(network.id, network.specVersion, true, "metadata")
    } catch {
      // buildStorage throws when the pallet/entry doesn't exist in metadata
      if (typeof network.specVersion === "number")
        setProxyPalletStatus(network.id, network.specVersion, false, "metadata")
      return { ok: true, networkId: network.id, sets: [] }
    }

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

    const result = await queryStorageAt(network.id, storageKeys, signal)
    const valuesByKey = new Map(result.changes)

    const sets: AccountProxySet[] = []
    const ss58Format = network.prefix ?? 42
    for (const [key, address] of keysByAddress.entries()) {
      const raw = valuesByKey.get(key) ?? null
      try {
        const { deposit, proxies } = decodeProxiesValue(raw, storageCodec, ss58Format)
        sets.push({
          delegator: address,
          networkId: network.id,
          proxyCount: proxies.length,
          deposit: deposit.toString(),
          isStale: false,
          proxies,
          lastDetailsFetchedAt: Date.now(),
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
