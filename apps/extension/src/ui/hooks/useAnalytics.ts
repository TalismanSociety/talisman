import { useCallback } from "react"

import { PostHogCaptureProperties } from "@extension/core/domains/analytics/types"
import { api } from "@ui/api"

export const useAnalytics = () => {
  const genericEvent = useCallback((eventName: string, options: PostHogCaptureProperties = {}) => {
    api.analyticsCapture({ eventName, options })
  }, [])

  const pageOpenEvent = useCallback((pageName: string, options: PostHogCaptureProperties = {}) => {
    api.analyticsCapture({ eventName: `open ${pageName}`, options })
  }, [])

  const popupOpenEvent = useCallback((page: string, options: PostHogCaptureProperties = {}) => {
    api.analyticsCapture({ eventName: "open popup", options: { ...options, page } })
  }, [])

  return {
    genericEvent,
    pageOpenEvent,
    popupOpenEvent,
  }
}
