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

      case "pri(chaindata.networks.upsert)": {
        const network = request as RequestTypes["pri(chaindata.networks.upsert)"]
        await customChaindataStore.upsertNetwork(network)
        return true
      }

      case "pri(chaindata.networks.remove)": {
        const { id } = request as RequestTypes["pri(chaindata.networks.remove)"]
        await customChaindataStore.removeToken(id)
        return true
      }

      case "pri(chaindata.tokens.upsert)": {
        const token = request as RequestTypes["pri(chaindata.tokens.upsert)"]
        try {
          await customChaindataStore.upsertToken(token)
        } catch (err) {
          throw new Error(`Failed to upsert token: ${err}`)
        }
        return true
      }

      case "pri(chaindata.tokens.remove)": {
        const { id } = request as RequestTypes["pri(chaindata.tokens.remove)"]
        await customChaindataStore.removeToken(id)
        return true
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
