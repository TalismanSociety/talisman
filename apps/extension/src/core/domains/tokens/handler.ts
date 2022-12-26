import { ChainId } from "@core/domains/chains/types"
import { getErc20TokenId } from "@core/domains/ethereum/helpers"
import { CustomErc20Token, CustomErc20TokenCreate } from "@core/domains/tokens/types"
import { ExtensionHandler } from "@core/libs/Handler"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { Port, RequestIdOnly } from "@core/types/base"
import { assert } from "@polkadot/util"
import { githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import { MessageTypes, RequestTypes, ResponseType } from "core/types"

export default class TokensHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // token handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(tokens.subscribe)":
        return this.stores.tokens.hydrateStore()

      // --------------------------------------------------------------------
      // ERC20 token handlers -----------------------------------------------------
      // --------------------------------------------------------------------

      case "pri(tokens.erc20.custom)":
        return Object.values(await chaindataProvider.tokens()).filter(
          // note : need to check type too because isCustom is also set to true for native tokens of custom networks
          (token) => "isCustom" in token && token.isCustom && token.type === "evm-erc20"
        ) as any

      case "pri(tokens.erc20.custom.byid)": {
        const token = await chaindataProvider.getToken((request as RequestIdOnly).id)
        if (!token || !("isCustom" in token)) return
        return token
      }

      case "pri(tokens.erc20.custom.add)": {
        const token = request as CustomErc20TokenCreate
        const networkId = token.chainId || token.evmNetworkId
        assert(networkId, "A chainId or an evmNetworkId is required")
        const chain = token.chainId ? await chaindataProvider.getChain(token.chainId) : undefined
        const evmNetwork = token.evmNetworkId
          ? await chaindataProvider.getEvmNetwork(token.evmNetworkId)
          : undefined
        assert(typeof token.contractAddress === "string", "A contract address is required")
        assert(typeof token.symbol === "string", "A token symbol is required")
        assert(typeof token.decimals === "number", "A number of token decimals is required")

        const tokenId = getErc20TokenId(networkId, token.contractAddress)
        const existing = await chaindataProvider.getToken(tokenId)
        assert(!existing, "This token already exists")

        const { symbol, decimals, coingeckoId, contractAddress, image } = token

        const newToken: CustomErc20Token = {
          id: tokenId,
          type: "evm-erc20",
          isTestnet: (chain || evmNetwork)?.isTestnet || false,
          symbol,
          decimals: Number(decimals), // some dapps (ie moonriver.moonscan.io) may send a string here, which breaks balances
          logo: image || githubUnknownTokenLogoUrl,
          coingeckoId,
          contractAddress,
          // chain: token.chainId ? { id: token.chainId } : undefined,
          evmNetwork: token.evmNetworkId ? { id: token.evmNetworkId } : null,
          isCustom: true,
          image,
        }

        return await chaindataProvider.addCustomToken(newToken)
      }

      case "pri(tokens.erc20.custom.remove)":
        return await chaindataProvider.removeCustomToken((request as RequestIdOnly).id)

      case "pri(tokens.erc20.custom.clear)": {
        const filter = request as { chainId?: ChainId; evmNetworkId?: string } | undefined
        const deleteFilterFn = (token: CustomErc20Token) =>
          filter === undefined
            ? // delete if no filter set
              true
            : filter.chainId === token.chain?.id
            ? // delete if chainId filter set and this token is on the chain
              true
            : filter.evmNetworkId === token.evmNetwork?.id
            ? // delete if evmNetworkId set and this token is on the evmNetwork
              true
            : // don't delete
              false

        const deleteTokens = Object.values(await chaindataProvider.tokens())
          .filter((token): token is CustomErc20Token => {
            if (token.type !== "evm-erc20") return false
            if (!("isCustom" in token)) return false
            return true
          })
          .filter(deleteFilterFn)
          .map((token) => token.id)
        await Promise.all(
          deleteTokens.map((tokenId) => chaindataProvider.removeCustomToken(tokenId))
        )
        return
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
