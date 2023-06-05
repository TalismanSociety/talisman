import { getErc20TokenId } from "@core/domains/ethereum/helpers"
import { CustomErc20Token, CustomErc20TokenCreate } from "@core/domains/tokens/types"
import { talismanAnalytics } from "@core/libs/Analytics"
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // token handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(tokens.subscribe)":
        return chaindataProvider.hydrateTokens()

      // --------------------------------------------------------------------
      // ERC20 token handlers -----------------------------------------------------
      // --------------------------------------------------------------------

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
          evmNetwork: token.evmNetworkId ? { id: token.evmNetworkId } : null,
          isCustom: true,
          image,
        }

        talismanAnalytics.capture(`${existing ? "update" : "add"} custom ERC20 token`, {
          evmNetworkId: token.evmNetworkId,
          symbol: token.symbol,
          contractAddress,
        })

        return chaindataProvider.addCustomToken(newToken)
      }

      case "pri(tokens.erc20.custom.remove)":
        return chaindataProvider.removeCustomToken((request as RequestIdOnly).id)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
