import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useCallback, useState } from "react"

export const useRuntimeReload = (analyticsPage: AnalyticsPage) => {
  const [hasRuntimeReloadFn] = useState(() => typeof window?.chrome?.runtime?.reload === "function")
  const runtimeReload = useCallback(() => {
    sendAnalyticsEvent({
      ...analyticsPage,
      name: "Interact",
      action: "Reload Talisman button",
    })

    chrome.runtime.reload()
  }, [analyticsPage])

  return [hasRuntimeReloadFn, runtimeReload] as const
}
