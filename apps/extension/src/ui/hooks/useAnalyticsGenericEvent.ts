import posthog from "posthog-js"
import { useEffect } from "react"

import { useAnalytics } from "./useAnalytics"

// immutable
const DEFAULT_VALUE = {}

/**
 *
 * @param eventName
 * @param options Make sure value is immutable or it may trigger event on each rerender
 */
export const useAnalyticsGenericEvent = (
  eventName: string,
  options: posthog.Properties = DEFAULT_VALUE
) => {
  const { genericEvent } = useAnalytics()

  useEffect(() => {
    genericEvent(eventName, options)
  }, [eventName, genericEvent, options])
}
