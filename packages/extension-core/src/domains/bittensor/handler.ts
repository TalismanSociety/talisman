import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { bittensorValidators$ } from "./store.validators"

export class BittensorHandler extends ExtensionHandler {
  public async handle<
    Type extends MessageTypes,
    Request = RequestTypes[Type],
    Response = ResponseType<Type>,
  >(id: string, type: Type, request: Request, port: chrome.runtime.Port): Promise<Response> {
    switch (type) {
      case "pri(bittensor.validators.subscribe)":
        return genericSubscription(id, port, bittensorValidators$) as Response

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
