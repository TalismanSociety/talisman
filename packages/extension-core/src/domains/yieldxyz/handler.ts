import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { walletYieldxyzPositions$ } from "./walletYieldxyzPositions"
import { walletYieldxyzProducts$ } from "./walletYieldxyzProducts"
import { yieldxyzProviders$ } from "./yieldxyzProviders"

export class YieldxyzHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(yieldxyz.positions.subscribe)":
        return genericSubscription(id, port, walletYieldxyzPositions$)

      case "pri(yieldxyz.products.subscribe)":
        return genericSubscription(id, port, walletYieldxyzProducts$)

      case "pri(yieldxyz.providers.subscribe)":
        return genericSubscription(id, port, yieldxyzProviders$)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
