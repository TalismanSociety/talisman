import type { MessageTypes, RequestTypes, ResponseType } from "../../../types"
import type { Port } from "../../../types/base"
import { TabStore } from "../../../handlers/stores"
import { genericSubscription, unsubscribe } from "../../../handlers/subscriptions"
import { TabsHandler } from "../../../libs/Handler"
import { chaindataProvider } from "../../../rpcs/chaindata"
import TalismanRpcHandler from "./rpc"

export default class TalismanHandler extends TabsHandler {
  readonly #subHandlers: readonly TabsHandler[]

  constructor(stores: TabStore) {
    super(stores)

    // TODO check if this is actually used and needed
    this.#subHandlers = [new TalismanRpcHandler(stores)]
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
    url: string,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pub(talisman.customSubstrateChains.subscribe)": {
        return genericSubscription(id, port, chaindataProvider.customChainsObservable)
      }

      case "pub(talisman.customSubstrateChains.unsubscribe)": {
        const subId = request as RequestTypes["pub(talisman.customSubstrateChains.unsubscribe)"]
        return unsubscribe(subId)
      }

      case "pub(talisman.customEvmNetworks.subscribe)": {
        return genericSubscription(id, port, chaindataProvider.customEvmNetworksObservable)
      }

      case "pub(talisman.customEvmNetworks.unsubscribe)": {
        const subId = request as RequestTypes["pub(talisman.customEvmNetworks.unsubscribe)"]
        return unsubscribe(subId)
      }

      case "pub(talisman.customTokens.subscribe)": {
        return genericSubscription(id, port, chaindataProvider.customTokensObservable)
      }

      case "pub(talisman.customTokens.unsubscribe)": {
        const subId = request as RequestTypes["pub(talisman.customTokens.unsubscribe)"]
        return unsubscribe(subId)
      }

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
