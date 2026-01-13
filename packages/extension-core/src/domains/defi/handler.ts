import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import { defiPositions$ } from "./getDefiPositions"

export class DefiHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    _request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(defi.positions.subscribe)":
        return genericSubscription(id, port, defiPositions$)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
