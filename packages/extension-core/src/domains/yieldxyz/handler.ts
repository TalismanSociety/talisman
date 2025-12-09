import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { walletYieldxyzOpportunities$ } from "./walletYieldxyzOpportunities"
import { walletYieldxyzPositions$ } from "./walletYieldxyzPositions"
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

      case "pri(yieldxyz.opportunities.subscribe)":
        return genericSubscription(id, port, walletYieldxyzOpportunities$)

      case "pri(yieldxyz.providers.subscribe)":
        return genericSubscription(id, port, yieldxyzProviders$)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
