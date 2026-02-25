import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { gandalfAccessToken$ } from "./observable"

export class GandalfHandler extends ExtensionHandler {
  public async handle<
    Type extends MessageTypes,
    Request = RequestTypes[Type],
    Response = ResponseType<Type>,
  >(id: string, type: Type, _request: Request, port: chrome.runtime.Port): Promise<Response> {
    switch (type) {
      case "pri(gandalf.accessToken.subscribe)":
        return genericSubscription(id, port, gandalfAccessToken$) as Response
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
