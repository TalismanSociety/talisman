import { log } from "@common/log"
import type { NetworkId } from "@talismn/chaindata-provider"
import { splitSubject } from "@talismn/util"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, ReplaySubject, skip } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"

type ProxyPalletCacheEntry = {
  specVersion: number
  hasProxyPallet: boolean
  /** Whether pallet status was determined via metadata or a raw storage probe. */
  source?: "metadata" | "probe"
}

export type ProxyPalletCache = Record<NetworkId, ProxyPalletCacheEntry>

const blobStore = getBlobStore<ProxyPalletCache>("proxy-pallet-cache")

const [setCache, proxyPalletCache$] = splitSubject(new ReplaySubject<ProxyPalletCache>(1))

let currentCache: ProxyPalletCache = {}

/** Strip `false` entries from raw storage probes — they can never reliably
 *  distinguish "no pallet" from "no proxies for this account".
 *  Metadata-derived `false` entries are kept because they are definitive. */
const sanitiseCache = (raw: ProxyPalletCache): ProxyPalletCache => {
  const cleaned: ProxyPalletCache = {}
  for (const [id, entry] of Object.entries(raw)) {
    if (entry.hasProxyPallet || entry.source === "metadata") cleaned[id] = entry
  }
  return cleaned
}

walletReady.then(() => {
  blobStore
    .get()
    .then((data) => {
      currentCache = data ? sanitiseCache(data) : {}
      log.debug("[proxyPalletCache] loaded from store", currentCache)
      setCache(currentCache)
    })
    .catch((err) => {
      log.error("[proxyPalletCache] failed to load from store", err)
      setCache(currentCache)
    })

  // persist when updated
  proxyPalletCache$
    .pipe(skip(1), debounceTime(2_000), distinctUntilChanged(isEqual))
    .subscribe((cache) => {
      log.debug(`[proxyPalletCache] persisting (${Object.keys(cache).length} entries)`, cache)
      blobStore.set(cache)
    })
})

/**
 * Check the cached proxy pallet status for a network.
 *
 * Returns `true` when pallet existence is confirmed, `false` when
 * definitively ruled out via metadata inspection, or `undefined`
 * when no cached result exists (probe required).
 */
export const getProxyPalletStatus = (
  networkId: NetworkId,
  specVersion: number | undefined
): boolean | undefined => {
  const entry = currentCache[networkId]
  if (!entry || specVersion === undefined) return undefined
  if (entry.specVersion !== specVersion) return undefined
  return entry.hasProxyPallet
}

/**
 * Record a positive pallet-existence confirmation for a network.
 *
 * `false` should only be set from **metadata-based** callers that can
 * definitively determine pallet absence. Raw storage probes must only
 * pass `true` (non-null storage confirms existence, but null is ambiguous).
 */
export const setProxyPalletStatus = (
  networkId: NetworkId,
  specVersion: number,
  hasProxyPallet: boolean,
  source: "metadata" | "probe" = "probe"
): void => {
  const existing = currentCache[networkId]
  if (
    existing?.specVersion === specVersion &&
    existing.hasProxyPallet === hasProxyPallet &&
    existing.source === source
  )
    return
  currentCache = { ...currentCache, [networkId]: { specVersion, hasProxyPallet, source } }
  setCache(currentCache)
}
