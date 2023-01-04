import { api } from "@ui/api"
import { Properties } from "posthog-js"
import { useCallback } from "react"

export const useAnalytics = () => {
  const genericEvent = useCallback((eventName: string, options: Properties = {}) => {
    api.analyticsCapture({ eventName, options })
  }, [])

  const pageOpenEvent = useCallback((pageName: string, options: Properties = {}) => {
    api.analyticsCapture({ eventName: `open ${pageName}`, options })
  }, [])

  const popupOpenEvent = useCallback((page: string, options: Properties = {}) => {
    api.analyticsCapture({ eventName: "open popup", options: { ...options, page } })
  }, [])

  return {
    genericEvent,
    pageOpenEvent,
    popupOpenEvent,
  }
}
