import type { TokenId } from "@talismn/chaindata-provider"

import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"

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

      case "pri(tokenRates.registerAdditional)":
        this.stores.tokenRates.registerAdditional(request as TokenId[])
        return true

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
