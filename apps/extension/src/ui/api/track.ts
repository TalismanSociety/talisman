import type { Track } from "@common/analytics/catalogue"

import { api } from "./api"
import { pageContext } from "./pageContext"

export const track: Track = (event, ...[properties = {}]) => {
  api.analyticsTrack({ event, properties, screen: pageContext.screen ?? undefined }).catch(() => {})
}
