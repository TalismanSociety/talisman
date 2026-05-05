import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import { accountProxies$, loadProxyDetails, refreshAccountProxies } from "./accountProxies"

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
        refreshAccountProxies({ networkId, address })
        return true as ResponseType<TMessageType>
      }

      case "pri(accountProxies.loadDetails)": {
        const { networkId, address } = request as RequestTypes["pri(accountProxies.loadDetails)"]
        return loadProxyDetails(networkId, address) as ResponseType<TMessageType>
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
