import type { Track } from "@common/analytics/catalogue"

import { api } from "./api"

export const track: Track = (event, ...[properties = {}]) => {
  api.analyticsTrack({ event, properties }).catch(() => {})
}
