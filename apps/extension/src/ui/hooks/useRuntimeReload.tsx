import { db as talismanDb } from "@core/db"
import { assetDiscoveryStore } from "@core/domains/assetDiscovery/store"
import { type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useCallback, useState } from "react"

export const useRuntimeReload = (analyticsPage: AnalyticsPage) => {
  const [hasRuntimeReloadFn] = useState(() => typeof chrome?.runtime?.reload === "function")
  const runtimeReload = useCallback(async () => {
    sendAnalyticsEvent({
      ...analyticsPage,
      name: "Interact",
      action: "Reload Talisman button",
    })

    // these do not contain any user data, they will be safely recreated on next startup
    await Promise.allSettled([
      assetDiscoveryStore.reset(),
      tryDeleteDatabase("TalismanConnectionMeta"), // legacy rpc priority/backoff db, no longer used
      talismanDb.metadata.clear(),
      talismanDb.blobs.clear(), // chaindata, balances, nfts etc
      tryDeleteDatabase("TalismanChaindata"), // old chaindata db
      tryDeleteDatabase("TalismanChaindataV4"), // current chaindata db, it will be recreated on next startup
      chrome.storage.local.remove(["gandalf"]), // force re-registration on gandalf
    ])

    chrome.runtime.reload()
  }, [analyticsPage])

  return [hasRuntimeReloadFn, runtimeReload] as const
}

const tryDeleteDatabase = (name: string) => {
  return new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(name)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}
