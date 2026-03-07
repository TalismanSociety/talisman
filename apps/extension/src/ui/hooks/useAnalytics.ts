import type { PostHogCaptureProperties } from "@core/types/domains"
import { api } from "@ui/api"
import { useCallback } from "react"

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
