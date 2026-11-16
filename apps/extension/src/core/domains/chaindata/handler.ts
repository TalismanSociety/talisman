import { isNativeToken, isNetworkOfPlatform, subDTaoTokenId } from "@talismn/chaindata-provider"
import { isSs58Address } from "@talismn/crypto"

import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { chainConnectorDot } from "../../rpcs/chain-connector-dot"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chainConnectorSol } from "../../rpcs/chain-connector-sol"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import { buildDTaoPositionToken } from "./dTaoPosition"
import { customChaindataStore } from "./store.customChaindata"
import type { RequestRegisterDTaoPosition } from "./types"

export class ChaindataHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
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

      case "pri(chaindata.tokens.registerDTaoPosition)": {
        const position = request as RequestTypes["pri(chaindata.tokens.registerDTaoPosition)"]
        return registerDTaoPosition(position)
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}

const registerDTaoPosition = async ({ networkId, netuid, hotkey }: RequestRegisterDTaoPosition) => {
  const subnet = await chaindataProvider.getTokenById(
    subDTaoTokenId(networkId, netuid),
    "substrate-dtao"
  )
  if (!subnet) throw new Error(`Unknown subnet ${netuid} on ${networkId}`)
  if (!isSs58Address(hotkey)) throw new Error("A validator's hotkey is a substrate address")

  const position = buildDTaoPositionToken(subnet, hotkey)
  await chaindataProvider.registerDynamicTokens([position])
  return position.id
}

const clearRpcProviderCache = async (networkId: string) => {
  chainConnectorEvm.clearRpcProvidersCache(networkId)
  chainConnectorSol.clearRpcProvidersCache(networkId)
  await chainConnectorDot.reset(networkId)
}
