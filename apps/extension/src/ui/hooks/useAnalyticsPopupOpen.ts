import posthog from "posthog-js"
import { useEffect } from "react"

import { useAnalytics } from "./useAnalytics"

// immutable
const DEFAULT_VALUE = {}

/**
 *
 * @param pageName
 * @param options Make sure value is immutable or it may trigger event on each rerender
 */ export const useAnalyticsPopupOpen = (
  pageName: string,
  options: posthog.Properties = DEFAULT_VALUE
) => {
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent(pageName, options)
  }, [popupOpenEvent, pageName, options])
}
