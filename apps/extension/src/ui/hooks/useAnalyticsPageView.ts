import { useEffect, useRef } from "react"

import { PostHogCaptureProperties } from "@extension/core/domains/analytics/types"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"

const DEFAULT_PROPERTIES: PostHogCaptureProperties = {}

// using this hook prevents multiple page view captures from a given component
export const useAnalyticsPageView = (
  page: AnalyticsPage,
  properties: PostHogCaptureProperties = DEFAULT_PROPERTIES,
) => {
  const refCaptured = useRef(false)

  useEffect(() => {
    if (refCaptured.current) return

    // ensure event isn't tracked more than once
    refCaptured.current = true

    sendAnalyticsEvent({
      name: "Pageview",
      ...page,
      properties,
    })
  }, [page, properties])
}
