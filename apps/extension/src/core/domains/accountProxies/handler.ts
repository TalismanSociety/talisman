import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import { accountProxies$, loadProxyDetails } from "./accountProxies"
import { setProxyPalletStatus } from "./store.proxyPalletCache"

export class AccountProxiesHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(accountProxies.subscribe)":
        return genericSubscription(id, port, accountProxies$) as ResponseType<TMessageType>

      case "pri(accountProxies.refresh)": {
        const { networkId, address } = request as RequestTypes["pri(accountProxies.refresh)"]
        // Use loadProxyDetails directly instead of refresh$ so the refresh
        // works even when no UI consumer is subscribed to accountProxies$.
        loadProxyDetails(networkId, address).catch(() => {})
        return true as ResponseType<TMessageType>
      }

      case "pri(accountProxies.loadDetails)": {
        const { networkId, address } = request as RequestTypes["pri(accountProxies.loadDetails)"]
        return loadProxyDetails(networkId, address) as ResponseType<TMessageType>
      }

      case "pri(accountProxies.updatePalletCache)": {
        const { networkId, specVersion, hasProxyPallet } =
          request as RequestTypes["pri(accountProxies.updatePalletCache)"]
        if (hasProxyPallet) setProxyPalletStatus(networkId, specVersion, true, "metadata")
        return true as ResponseType<TMessageType>
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
