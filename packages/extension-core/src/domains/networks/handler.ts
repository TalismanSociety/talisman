import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { chaindataProvider } from "../../rpcs/chaindata"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"

export default class NetworksHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(networks.subscribe)": {
        return genericSubscription(id, port, chaindataProvider.networksObservable)
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
