import { log } from "@common/log"
import type { HexString } from "@polkadot/util/types"
import type { NetworkId } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"

import { getMetadataDef } from "../../util/getMetadataDef"
import { getMetadataRpcFromDef } from "../metadata/helpers"

/** Required components of a recognisable Proxy pallet. */
const REQUIRED_STORAGE = ["Proxies"] as const
const REQUIRED_CALLS = ["add_proxy", "remove_proxy"] as const
const REQUIRED_CONSTANTS = ["ProxyDepositBase", "ProxyDepositFactor", "MaxProxies"] as const

type DetectionResult = {
  hasProxyPallet: boolean
  specVersion: number | undefined
}

const detectionCache = new Map<NetworkId, { specVersion: number; result: boolean }>()
const inflight = new Map<NetworkId, Promise<DetectionResult>>()

const inspectMetadata = (metadataRpc: HexString): boolean => {
  try {
    const { unifiedMetadata: metadata } = parseMetadataRpc(metadataRpc)

    const pallet = metadata.pallets.find((p) => p.name === "Proxy")
    if (!pallet) return false

    if (!pallet.storage) return false
    const storageNames = new Set(pallet.storage.items.map((s) => s.name))
    if (!REQUIRED_STORAGE.every((s) => storageNames.has(s))) return false

    if (!pallet.constants) return false
    const constantNames = new Set(pallet.constants.map((c) => c.name))
    if (!REQUIRED_CONSTANTS.every((c) => constantNames.has(c))) return false

    if (typeof pallet.calls?.type !== "number") return false
    const callsLookup = metadata.lookup.find((entry) => entry.id === pallet.calls?.type)
    if (!callsLookup || callsLookup.def.tag !== "variant") return false
    const callNames = new Set((callsLookup.def.value as Array<{ name: string }>).map((v) => v.name))
    if (!REQUIRED_CALLS.every((c) => callNames.has(c))) return false

    return true
  } catch (err) {
    log.warn("[accountProxies] failed to inspect metadata for Proxy pallet", err)
    return false
  }
}

/**
 * Returns true when the network exposes the standard `Proxy` pallet.
 *
 * Verifies that all of the following exist:
 *   - pallet named `Proxy`
 *   - storage entry `Proxies`
 *   - calls `add_proxy` and `remove_proxy`
 *   - constants `ProxyDepositBase`, `ProxyDepositFactor`, `MaxProxies`
 *
 * The result is cached in memory by `(networkId, specVersion)` and refreshed
 * automatically when the runtime spec version changes.
 */
export const hasProxyPallet = async (
  networkId: NetworkId,
  genesisHash: HexString | undefined | null
): Promise<DetectionResult> => {
  if (!genesisHash) return { hasProxyPallet: false, specVersion: undefined }

  const existing = inflight.get(networkId)
  if (existing) return existing

  const promise = (async (): Promise<DetectionResult> => {
    try {
      const metadataDef = await getMetadataDef(genesisHash)
      if (!metadataDef) return { hasProxyPallet: false, specVersion: undefined }

      const specVersion = metadataDef.specVersion as number | undefined
      const cached = detectionCache.get(networkId)
      if (cached && specVersion !== undefined && cached.specVersion === specVersion) {
        return { hasProxyPallet: cached.result, specVersion }
      }

      const metadataRpc = getMetadataRpcFromDef(metadataDef)
      if (!metadataRpc) return { hasProxyPallet: false, specVersion }

      const result = inspectMetadata(metadataRpc)
      if (specVersion !== undefined) detectionCache.set(networkId, { specVersion, result })
      return { hasProxyPallet: result, specVersion }
    } finally {
      inflight.delete(networkId)
    }
  })()

  inflight.set(networkId, promise)
  return promise
}
