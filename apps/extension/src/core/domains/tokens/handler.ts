import type {
  ChainId,
  CustomErc20Token,
  CustomErc20TokenCreate,
  MessageTypes,
  Port,
  RequestAuthorizedSiteForget,
  RequestAuthorizedSiteUpdate,
  RequestIdOnly,
  RequestTypes,
  ResponseType,
} from "core/types"

import { ExtensionHandler } from "@core/libs/Handler"
import { assert } from "@polkadot/util"

export default class TokensHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(tokens.erc20.custom)":
        return await this.stores.evmAssets.get()

      case "pri(tokens.erc20.custom.byid)":
        return await this.stores.evmAssets.get((request as RequestIdOnly).id)

      case "pri(tokens.erc20.custom.add)":
        const token = request as CustomErc20TokenCreate
        assert(
          typeof token.chainId === "string" || typeof token.evmNetworkId === "number",
          "Either a chainId or an evmNetworkId is required"
        )
        assert(typeof token.contractAddress === "string", "A contract address is required")
        assert(typeof token.symbol === "string", "A token symbol is required")
        assert(typeof token.decimals === "number", "A number of token decimals is required")

        const newToken: CustomErc20Token = {
          ...token,
          id: `${token.chainId || token.evmNetworkId}-erc20-${token.contractAddress}`,
          type: "erc20",
        }

        return await this.stores.evmAssets.set({ [newToken.id]: newToken })

      case "pri(tokens.erc20.custom.remove)":
        return await this.stores.evmAssets.remove((request as RequestIdOnly).id)

      case "pri(tokens.erc20.custom.clear)":
        const filter = request as { chainId?: ChainId; evmNetworkId?: string } | undefined
        const deleteFilterFn = (token: CustomErc20Token) =>
          filter === undefined
            ? // delete if no filter set
              true
            : filter.chainId === token.chainId
            ? // delete if chainId filter set and this token is on the chain
              true
            : filter.evmNetworkId === token.evmNetworkId
            ? // delete if evmNetworkId set and this token is on the evmNetwork
              true
            : // don't delete
              false

        const deleteTokens = Object.values(await this.stores.evmAssets.get()).filter(deleteFilterFn)
        return await Promise.all(deleteTokens.map(({ id }) => this.stores.evmAssets.remove(id)))

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
