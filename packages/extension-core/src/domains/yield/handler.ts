import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { yieldBalances$, yieldBalancesGrouped$ } from "./getYieldBalances"

export class YieldHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(yield.balances.subscribe)":
        return genericSubscription(id, port, yieldBalances$)
      case "pri(yield.balances.grouped.subscribe)":
        return genericSubscription(id, port, yieldBalancesGrouped$)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
