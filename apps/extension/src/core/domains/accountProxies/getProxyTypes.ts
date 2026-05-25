import { log } from "@common/log"
import type { HexString } from "@polkadot/util/types"
import { parseMetadataRpc } from "@talismn/scale"

export type ProxyTypeInfo = {
  /** The variant name exactly as defined in the runtime (e.g. "Any", "Governance"). */
  name: string
  /** Human-readable description from metadata docs. May be empty. */
  docs: string
}

/**
 * Extracts the `ProxyType` enum variants from the runtime metadata.
 *
 * Walks: Proxy pallet → calls type → `add_proxy` variant → `proxy_type` field
 * → lookup variant (the ProxyType enum). Only unit variants (no fields) are
 * returned because `Enum(name)` cannot encode variants that carry data.
 *
 * Returns an empty array when the proxy pallet is absent or the metadata shape
 * is unexpected — callers should treat this as "proxy types unavailable".
 */
export const getProxyTypes = (metadataRpc: HexString): ProxyTypeInfo[] => {
  try {
    const { unifiedMetadata: metadata } = parseMetadataRpc(metadataRpc as `0x${string}`)

    const pallet = metadata.pallets.find((p) => p.name === "Proxy")
    if (!pallet || typeof pallet.calls?.type !== "number") return []

    const callsLookup = metadata.lookup.find((entry) => entry.id === pallet.calls?.type)
    if (!callsLookup || callsLookup.def.tag !== "variant") return []

    const addProxyVariant = (
      callsLookup.def.value as Array<{
        name: string
        fields: Array<{ name: string | undefined; type: number }>
      }>
    ).find((v) => v.name === "add_proxy")
    if (!addProxyVariant) return []

    // Resolve the proxy_type field. Prefer by name, fall back to positional index 1
    // (standard signature: add_proxy(delegate, proxy_type, delay)).
    const proxyTypeField =
      addProxyVariant.fields.find((f) => f.name === "proxy_type") ??
      addProxyVariant.fields.find((f) => f.name === "proxyType") ??
      (addProxyVariant.fields.length >= 2 ? addProxyVariant.fields[1] : undefined)

    if (!proxyTypeField) return []

    const proxyTypeLookup = metadata.lookup.find((entry) => entry.id === proxyTypeField.type)
    if (!proxyTypeLookup || proxyTypeLookup.def.tag !== "variant") return []

    const variants = proxyTypeLookup.def.value as Array<{
      name: string
      fields: unknown[]
      index: number
      docs: string[]
    }>

    return variants
      .filter((v) => v.fields.length === 0)
      .map((v) => ({
        name: v.name,
        docs: v.docs.join(" ").trim(),
      }))
  } catch (err) {
    log.warn("[accountProxies] failed to extract proxy types from metadata", err)
    return []
  }
}
