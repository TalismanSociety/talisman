import { connectionMetaDb } from "@talismn/connection-meta"
import { assetDiscoveryStore, db as talismanDb } from "extension-core"
import { useCallback, useState } from "react"

import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"

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
      connectionMetaDb.delete(),
      talismanDb.metadata.clear(),
      talismanDb.blobs.clear(), // chaindata, balances, nfts etc
      tryDeleteDatabase("TalismanChaindata"), // old chaindata db
      tryDeleteDatabase("TalismanChaindataV4"), // current chaindata db, it will be recreated on next startup
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
