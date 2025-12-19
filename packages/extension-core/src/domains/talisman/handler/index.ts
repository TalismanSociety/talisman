import { isNetworkCustom, isTokenCustom } from "@talismn/chaindata-provider"
import { isTalismanUrl } from "extension-shared"
import { map } from "rxjs"

import type { MessageTypes, RequestTypes, ResponseType } from "../../../types"
import type { Port } from "../../../types/base"
import { TabStore } from "../../../handlers/stores"
import { genericSubscription, unsubscribe } from "../../../handlers/subscriptions"
import { TabsHandler } from "../../../libs/Handler"
import { windowManager } from "../../../libs/WindowManager"
import { chaindataProvider } from "../../../rpcs/chaindata"
import TalismanRpcHandler from "./rpc"

/**
 * Disabled all these messages for now by throwing an error, verified it doesn't break portal
 */
export default class TalismanHandler extends TabsHandler {
  readonly #subHandlers: readonly TabsHandler[]

  constructor(stores: TabStore) {
    super(stores)

    this.#subHandlers = [new TalismanRpcHandler(stores)]
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
    url: string,
  ): Promise<ResponseType<TMessageType>> {
    // these methods are pub() because they're exposed to dapps,
    // BUT they're actually only exposed to dapps where isTalismanHostname is true
    // which is only app.talisman.xyz in production, and also localhost in dev
    if (!isTalismanUrl(url)) throw new Error(`Origin not allowed for message type ${type}`)

    switch (type) {
      case "pub(talisman.customSubstrateChains.subscribe)": {
        throw new Error("Not implemented")
        return genericSubscription(
          id,
          port,
          chaindataProvider
            .getNetworks$("polkadot")
            .pipe(map((networks) => networks.filter(isNetworkCustom))),
        )
      }

      case "pub(talisman.customSubstrateChains.unsubscribe)": {
        throw new Error("Not implemented")
        const subId = request as RequestTypes["pub(talisman.customSubstrateChains.unsubscribe)"]
        return unsubscribe(subId)
      }

      case "pub(talisman.customEvmNetworks.subscribe)": {
        throw new Error("Not implemented")
        return genericSubscription(
          id,
          port,
          chaindataProvider
            .getNetworks$("ethereum")
            .pipe(map((networks) => networks.filter(isNetworkCustom))),
        )
      }

      case "pub(talisman.customEvmNetworks.unsubscribe)": {
        throw new Error("Not implemented")
        const subId = request as RequestTypes["pub(talisman.customEvmNetworks.unsubscribe)"]
        return unsubscribe(subId)
      }

      case "pub(talisman.customTokens.subscribe)": {
        throw new Error("Not implemented")
        return genericSubscription(
          id,
          port,
          chaindataProvider.tokens$.pipe(map((tokens) => tokens.filter(isTokenCustom))),
        )
      }

      case "pub(talisman.customTokens.unsubscribe)": {
        throw new Error("Not implemented")
        const subId = request as RequestTypes["pub(talisman.customTokens.unsubscribe)"]
        return unsubscribe(subId)
      }

      case "pub(talisman.extension.openPortfolio)": {
        await windowManager.openDashboard({ route: "/portfolio" })
        return true
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
