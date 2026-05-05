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

walletReady.then(() => {
  blobStore
    .get()
    .then((data) => {
      currentCache = data ?? {}
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
 * Returns `true` / `false` when we have a cached result at the given
 * `specVersion`, or `undefined` when we need to probe.
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

/** Update the cached pallet detection result for a network. */
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
