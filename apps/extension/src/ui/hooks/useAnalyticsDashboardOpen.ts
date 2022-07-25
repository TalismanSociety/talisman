import posthog from "posthog-js"
import { useEffect } from "react"

import { useAnalytics } from "./useAnalytics"

// immutable
const DEFAULT_VALUE = {}

/**
 *
 * @param pageName
 * @param options Make sure value is immutable or it may trigger event on each rerender
 */ export const useAnalyticsDashboardOpen = (
  pageName: string,
  options: posthog.Properties = DEFAULT_VALUE
) => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent(pageName, options)
  }, [pageOpenEvent, pageName, options])
}
