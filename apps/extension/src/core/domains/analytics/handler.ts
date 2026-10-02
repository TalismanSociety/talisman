import { RISK_VERDICTS } from "@common/analytics/dapp"
import { z } from "zod/v4"

import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestType, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import { dappRequestTracker } from "./dappRequests"
import { analyticsEngine } from "./engine"
import { uiContextFromSenderUrl } from "./environment"
import { parseTrackedEvent } from "./parse"

const requestRiskSchema = z.strictObject({
  id: z.string().max(128),
  verdict: z.enum(RISK_VERDICTS),
})

export class AnalyticsHandler extends ExtensionHandler {
  async handle<TMessageType extends MessageTypes>(
    _id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(analytics.track)":
        return analyticsEngine.capture({
          result: parseTrackedEvent(request),
          uiContext: uiContextFromSenderUrl(port.sender?.url),
          realNow: Date.now(),
        }) as Promise<ResponseType<TMessageType>>
      case "pri(analytics.requestRisk)": {
        const { id, verdict } = requestRiskSchema.parse(request)
        dappRequestTracker.noteRisk(id, verdict)
        return true as ResponseType<TMessageType>
      }
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
