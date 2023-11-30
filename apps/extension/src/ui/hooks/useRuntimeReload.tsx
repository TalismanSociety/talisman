import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useCallback, useState } from "react"
import Browser from "webextension-polyfill"

export const useRuntimeReload = (analyticsPage: AnalyticsPage) => {
  const [hasRuntimeReloadFn] = useState(() => typeof Browser?.runtime?.reload === "function")
  const runtimeReload = useCallback(() => {
    sendAnalyticsEvent({
      ...analyticsPage,
      name: "Interact",
      action: "Reload Talisman button",
    })

    Browser.runtime.reload()
  }, [analyticsPage])

  return [hasRuntimeReloadFn, runtimeReload] as const
}
