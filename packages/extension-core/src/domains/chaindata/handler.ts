import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { chaindataProvider } from "../../rpcs/chaindata"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { assetDiscoveryScanner } from "../assetDiscovery/scanner"

export class ChaindataHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(chaindata.networks.subscribe)": {
        return genericSubscription(id, port, chaindataProvider.networksObservable)
      }

      case "pri(chaindata.tokens.subscribe)": {
        // triggers a pending scan if any
        // TODO: find a better "place" to trigger this
        assetDiscoveryScanner.startPendingScan()

        return genericSubscription(id, port, chaindataProvider.tokensObservable)
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
