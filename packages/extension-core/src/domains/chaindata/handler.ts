import { isNativeToken, isNetworkOfPlatform } from "@talismn/chaindata-provider"

import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { chainConnector } from "../../rpcs/chain-connector"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { customChaindataStore } from "./store.customChaindata"

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
        const { platform, network, nativeToken } =
          request as RequestTypes["pri(chaindata.networks.upsert)"]

        // better safe than sorry
        if (!isNativeToken(nativeToken, platform))
          throw new Error("Provided native token is not a valid native token for the platform")
        if (!isNetworkOfPlatform(network, platform))
          throw new Error("Provided network is not a valid network for the platform")
        if (network.nativeTokenId !== nativeToken.id)
          throw new Error("Network native token ID does not match the provided native token ID")

        await customChaindataStore.upsert([network], [nativeToken])

        await clearRpcProviderCache(network.id)

        return true
      }

      case "pri(chaindata.networks.remove)": {
        const { id } = request as RequestTypes["pri(chaindata.networks.remove)"]

        await customChaindataStore.removeNetwork(id)

        await clearRpcProviderCache(id)

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

const clearRpcProviderCache = async (networkId: string) => {
  chainConnectorEvm.clearRpcProvidersCache(networkId)
  await chainConnector.reset(networkId)
}
