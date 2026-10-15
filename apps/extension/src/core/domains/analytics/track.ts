import type { Track } from "@common/analytics/catalogue"
import { log } from "@common/log"

import { analyticsEngine } from "./engine"
import { parseTrackedEvent } from "./parse"

export const track: Track = (event, ...[properties = {}]) => {
  const realNow = Date.now()
  analyticsEngine
    .capture({ result: parseTrackedEvent({ event, properties }), uiContext: "background", realNow })
    .catch((cause) => log.error("[analytics] capture failed", { cause }))
}
