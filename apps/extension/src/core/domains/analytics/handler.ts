import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestType, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import { analyticsEngine } from "./engine"
import { uiContextFromSenderUrl } from "./environment"
import { parseTrackedEvent } from "./parse"

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
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
