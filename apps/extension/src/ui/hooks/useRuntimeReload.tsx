import { db as balancesDb } from "@talismn/balances"
import { connectionMetaDb } from "@talismn/connection-meta"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useCallback, useState } from "react"
import Browser from "webextension-polyfill"

export const useRuntimeReload = (analyticsPage: AnalyticsPage) => {
  const [hasRuntimeReloadFn] = useState(() => typeof Browser?.runtime?.reload === "function")
  const runtimeReload = useCallback(async () => {
    sendAnalyticsEvent({
      ...analyticsPage,
      name: "Interact",
      action: "Reload Talisman button",
    })

    // these 2 dbs do not contain any user data, they will be safely recreated on next startup
    await Promise.allSettled([balancesDb.delete(), connectionMetaDb.delete()])

    chrome.runtime.reload()
  }, [analyticsPage])

  return [hasRuntimeReloadFn, runtimeReload] as const
}
