import { ExtensionHandler } from "@core/libs/Handler"
import { Port } from "@core/types/base"
import { MessageTypes, RequestTypes, ResponseType } from "core/types"

export default class TokenRatesHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // tokenRates handlers ------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(tokenRates.subscribe)":
        return this.stores.tokenRates.hydrateStore()

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
