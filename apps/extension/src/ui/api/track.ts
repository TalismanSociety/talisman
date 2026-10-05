import { isEventName, type Track } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"

import { api } from "./api"
import { pageContext } from "./pageContext"

export const track: Track = (event, ...[properties = {}]) => {
  api.analyticsTrack({ event, properties, screen: pageContext.screen ?? undefined }).catch(() => {})
}

export const trackFlowEvent = (
  event: string,
  properties: EventProperties,
  transactionId: string | undefined
) => {
  if (!isEventName(event)) return
  api
    .analyticsTrack({
      event,
      properties,
      screen: pageContext.screen ?? undefined,
      ...(transactionId !== undefined && { transactionId }),
    })
    .catch(() => {})
}
