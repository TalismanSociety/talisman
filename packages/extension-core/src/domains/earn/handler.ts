import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestType, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import {
  refreshYieldxyzPosition,
  walletYieldxyzPositions$,
} from "./yieldxyz/walletYieldxyzPositions"
import { walletYieldxyzProducts$ } from "./yieldxyz/walletYieldxyzProducts"
import { yieldxyzProviders$ } from "./yieldxyz/yieldxyzProviders"

export class EarnHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(earn.yieldxyz.positions.subscribe)":
        return genericSubscription(id, port, walletYieldxyzPositions$)

      case "pri(earn.yieldxyz.positions.refresh)":
        return refreshYieldxyzPosition(
          request as RequestType<"pri(earn.yieldxyz.positions.refresh)">,
        )

      case "pri(earn.yieldxyz.products.subscribe)":
        return genericSubscription(id, port, walletYieldxyzProducts$)

      case "pri(earn.yieldxyz.providers.subscribe)":
        return genericSubscription(id, port, yieldxyzProviders$)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
