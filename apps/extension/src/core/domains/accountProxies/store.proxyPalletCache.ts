import { log } from "@common/log"
import type { NetworkId } from "@talismn/chaindata-provider"
import { splitSubject } from "@talismn/util"
import { debounceTime, distinctUntilChanged, ReplaySubject, skip } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"

type ProxyPalletCacheEntry = {
  specVersion: number
  hasProxyPallet: boolean
}

export type ProxyPalletCache = Record<NetworkId, ProxyPalletCacheEntry>

const blobStore = getBlobStore<ProxyPalletCache>("proxy-pallet-cache")

const [setCache, proxyPalletCache$] = splitSubject(new ReplaySubject<ProxyPalletCache>(1))

let currentCache: ProxyPalletCache = {}

/** Strip entries with `hasProxyPallet: false` — raw storage probes can never
 *  reliably distinguish "no pallet" from "no proxies for this account". */
const sanitiseCache = (raw: ProxyPalletCache): ProxyPalletCache => {
  const cleaned: ProxyPalletCache = {}
  for (const [id, entry] of Object.entries(raw)) {
    if (entry.hasProxyPallet) cleaned[id] = entry
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
    .pipe(skip(1), debounceTime(2_000), distinctUntilChanged())
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
  hasProxyPallet: boolean
): void => {
  const existing = currentCache[networkId]
  if (existing?.specVersion === specVersion && existing.hasProxyPallet === hasProxyPallet) return
  currentCache = { ...currentCache, [networkId]: { specVersion, hasProxyPallet } }
  setCache(currentCache)
}
