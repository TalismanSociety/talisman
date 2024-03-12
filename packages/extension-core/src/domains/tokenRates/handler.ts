import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"

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
        return this.stores.tokenRates.subscribe(id, port)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
