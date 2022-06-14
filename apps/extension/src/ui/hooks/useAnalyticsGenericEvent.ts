import { useEffect } from "react"
import { useAnalytics } from "./useAnalytics"
import posthog from "posthog-js"

export const useAnalyticsGenericEvent = (eventName: string, options: posthog.Properties = {}) => {
  const { genericEvent } = useAnalytics()

  useEffect(() => {
    genericEvent(eventName, options)
  }, [eventName, genericEvent, options])
}
