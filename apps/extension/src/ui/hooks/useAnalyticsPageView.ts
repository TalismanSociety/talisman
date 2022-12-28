import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import posthog from "posthog-js"
import { useEffect, useRef } from "react"

const DEFAULT_PROPERTIES: posthog.Properties = {}

// using this hook prevents multiple page view captures from a given component
export const useAnalyticsPageView = (
  page: AnalyticsPage,
  properties: posthog.Properties = DEFAULT_PROPERTIES
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
