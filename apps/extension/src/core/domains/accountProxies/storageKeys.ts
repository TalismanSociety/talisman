import { compact, Twox64Concat, Twox128 } from "@polkadot-api/substrate-bindings"
import { fromHex, mergeUint8, toHex } from "@polkadot-api/utils"

/**
 * Precomputed `Proxy.Proxies` storage map prefix:
 * `Twox128("Proxy") ++ Twox128("Proxies")`.
 *
 * Stable across all standard Substrate chains — computed once at module load.
 */
const PROXY_PROXIES_PREFIX = mergeUint8([
  Twox128(new TextEncoder().encode("Proxy")),
  Twox128(new TextEncoder().encode("Proxies")),
])

/**
 * Builds the full `Proxy.Proxies` storage key for a given AccountId (raw bytes).
 *
 * Key layout: `Twox128("Proxy") ++ Twox128("Proxies") ++ Twox64Concat(accountId)`
 * = 16 + 16 + 8 + 32 = 72 bytes for a standard 32-byte AccountId.
 *
 * The hasher `Twox64Concat` is fixed in `substrate/frame/proxy/src/lib.rs`.
 */
export const getProxyProxiesKey = (accountId: Uint8Array): `0x${string}` =>
  toHex(mergeUint8([PROXY_PROXIES_PREFIX, Twox64Concat(accountId)])) as `0x${string}`

/**
 * Decode the proxy count from a raw SCALE-encoded `Proxy.Proxies(...)` value
 * without needing any metadata.
 *
 * The storage value is `(BoundedVec<ProxyDefinition, MaxProxies>, Balance)`.
 * `BoundedVec` is encoded as `Compact<u32>(length) ++ items...`, so the first
 * bytes are always a SCALE compact-encoded count regardless of the item layout.
 *
 * Returns 0 when `rawValue` is absent (the runtime default for an unset key).
 */
export const decodeProxyCount = (rawValue: `0x${string}` | null): number => {
  if (!rawValue || rawValue === "0x") return 0
  const bytes = fromHex(rawValue)
  if (bytes.length === 0) return 0
  return Number(compact.dec(bytes))
}
