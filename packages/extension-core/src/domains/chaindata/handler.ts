import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { chaindataProvider } from "../../rpcs/chaindata"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { customChaindataStore } from "./store"

export class ChaindataHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(chaindata.networks.subscribe)": {
        return genericSubscription(id, port, chaindataProvider.getNetworks$())
      }

      case "pri(chaindata.tokens.subscribe)": {
        return genericSubscription(id, port, chaindataProvider.tokens$)
      }

      case "pri(chaindata.networks.add)": {
        const network = request as RequestTypes["pri(chaindata.networks.add)"]
        return customChaindataStore.upsertNetwork(network)
      }

      case "pri(chaindata.networks.remove)": {
        const { id } = request as RequestTypes["pri(chaindata.networks.remove)"]
        return customChaindataStore.removeToken(id)
      }

      case "pri(chaindata.tokens.add)": {
        const token = request as RequestTypes["pri(chaindata.tokens.add)"]
        return customChaindataStore.upsertToken(token)
      }

      case "pri(chaindata.tokens.remove)": {
        const { id } = request as RequestTypes["pri(chaindata.tokens.remove)"]
        return customChaindataStore.removeToken(id)
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
