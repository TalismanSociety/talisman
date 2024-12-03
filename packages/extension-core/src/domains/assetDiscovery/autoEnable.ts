import { EvmNetwork, EvmNetworkId } from "@talismn/chaindata-provider"
import { liveQuery } from "dexie"
import { log } from "extension-shared"
import { uniq } from "lodash"
import { BehaviorSubject, combineLatest, distinctUntilChanged } from "rxjs"

import { db } from "../../db"
import { chaindataProvider } from "../../rpcs/chaindata"
import { isEvmToken } from "../../util/isEvmToken"
import { activeEvmNetworksStore } from "../ethereum/store.activeEvmNetworks"
import { activeTokensStore } from "../tokens/store.activeTokens"
import { assetDiscoveryStore } from "./store"

const isEnabled$ = new BehaviorSubject(false)

export const setAutoEnableDiscoveredAssets = (enable: boolean) => {
  isEnabled$.next(enable)
}

isEnabled$.pipe(distinctUntilChanged()).subscribe((isEnabled) => {
  if (!isEnabled) return

  return combineLatest([
    assetDiscoveryStore.observable,
    liveQuery(() => db.assetDiscovery.toArray()),
    activeTokensStore.observable,
    activeEvmNetworksStore.observable,
  ]).subscribe(async ([assetDiscovery, discoveredBalances, activeTokens, activeEvmNetworks]) => {
    try {
      // exit if a scan is active, to avoid restarting balance subscription too often
      if (assetDiscovery.currentScanId) return

      const tokenIds = uniq(discoveredBalances.map((entry) => entry.tokenId))
      const tokens = (
        await Promise.all(tokenIds.map((tokenId) => chaindataProvider.tokenById(tokenId)))
      ).filter(isEvmToken)

      const evmNetworkIds = uniq(
        tokens.map((token) => token.evmNetwork?.id).filter((id): id is EvmNetworkId => !!id),
      )
      const evmNetworks = (
        await Promise.all(evmNetworkIds.map((id) => chaindataProvider.evmNetworkById(id)))
      ).filter((network): network is EvmNetwork => !!network)

      // activate tokens that have not been explicitely disabled
      for (const token of tokens)
        if (activeTokens[token.id] === undefined) {
          log.debug("[AssetDiscovery] Automatically enabling discovered asset", { token })
          activeTokensStore.setActive(token.id, true)
        }

      // activate networks that have not been explicitely disabled
      for (const evmNetwork of evmNetworks)
        if (activeEvmNetworks[evmNetwork.id] === undefined) {
          log.debug("[AssetDiscovery] Automatically enabling discovered network", { evmNetwork })
          activeEvmNetworksStore.setActive(evmNetwork.id, true)
        }
    } catch (err) {
      log.error("[AssetDiscovery] Failed to automatically enable discovered assets", {
        err,
        discoveredBalances,
      })
    }
  })
})
