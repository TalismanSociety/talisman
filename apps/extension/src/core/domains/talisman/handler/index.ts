import { TabStore } from "@core/handlers/stores"
import { ObservableSubscriptions } from "@core/handlers/subscriptions"
import { TabsHandler } from "@core/libs/Handler"
import { chaindataProvider } from "@core/rpcs/chaindata"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import type { Port } from "@core/types/base"

import TalismanRpcHandler from "./rpc"

export default class TalismanHandler extends TabsHandler {
  readonly #subHandlers: readonly TabsHandler[]
  readonly #customTokensSubscriptions = new ObservableSubscriptions()
  readonly #customSubstrateChainsSubscriptions = new ObservableSubscriptions()

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
      case "pub(talisman.customSubstrateChains.subscribe)":
        return this.#customSubstrateChainsSubscriptions.subscribe(
          "pub(talisman.customSubstrateChains.subscribe)",
          id,
          port,
          chaindataProvider.subscribeCustomChains()
        )

      case "pub(talisman.customSubstrateChains.unsubscribe)":
        return this.#customSubstrateChainsSubscriptions.unsubscribe(
          request as RequestTypes["pub(talisman.customSubstrateChains.unsubscribe)"]
        )

      case "pub(talisman.customEvmNetworks.subscribe)":
        return this.#customSubstrateChainsSubscriptions.subscribe(
          "pub(talisman.customEvmNetworks.subscribe)",
          id,
          port,
          chaindataProvider.subscribeCustomEvmNetworks()
        )

      case "pub(talisman.customEvmNetworks.unsubscribe)":
        return this.#customSubstrateChainsSubscriptions.unsubscribe(
          request as RequestTypes["pub(talisman.customEvmNetworks.unsubscribe)"]
        )

      case "pub(talisman.customTokens.subscribe)":
        return this.#customTokensSubscriptions.subscribe(
          "pub(talisman.customTokens.subscribe)",
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
