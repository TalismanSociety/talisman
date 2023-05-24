import { TabStore } from "@core/handlers/stores"
import { createObservableSubscriptions } from "@core/handlers/subscriptions"
import { TabsHandler } from "@core/libs/Handler"
import { chaindataProvider } from "@core/rpcs/chaindata"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import type { Port } from "@core/types/base"

import TalismanRpcHandler from "./rpc"

export default class TalismanHandler extends TabsHandler {
  readonly #subHandlers: readonly TabsHandler[]
  readonly #customTokensSubscriptions = createObservableSubscriptions()

  constructor(stores: TabStore) {
    super(stores)
    this.#subHandlers = [new TalismanRpcHandler(stores)]
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
    url: string
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pub(talisman.customTokens.subscribe)":
        return this.#customTokensSubscriptions.subscribe(
          type,
          id,
          port,
          chaindataProvider.subscribeCustomTokens()
        )

      case "pub(talisman.customTokens.unsubscribe)":
        return this.#customTokensSubscriptions.unsubscribe(
          request as RequestTypes["pub(talisman.customTokens.unsubscribe)"]
        )

      default:
        for (const handler of this.#subHandlers) {
          try {
            return handler.handle(id, type, request, port, url)
          } catch {
            continue
          }
        }
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
