import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { walletYieldxyzPositions$ } from "./walletYieldxyzPositions"

export class YieldxyzHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(yieldxyz.balances.grouped.subscribe)":
        return genericSubscription(id, port, walletYieldxyzPositions$)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
