import { db as balancesDb } from "@talismn/balances"
import { connectionMetaDb } from "@talismn/connection-meta"
import { db as talismanDb } from "extension-core"
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
      balancesDb.delete(),
      connectionMetaDb.delete(),
      talismanDb.metadata.clear(),
      talismanDb.blobs.clear(),
    ])

    chrome.runtime.reload()
  }, [analyticsPage])

  return [hasRuntimeReloadFn, runtimeReload] as const
}
