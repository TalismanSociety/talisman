import { assert } from "@polkadot/util"
import {
  CustomEvmErc20Token,
  CustomEvmUniswapV2Token,
  evmErc20TokenId,
  evmUniswapV2TokenId,
} from "@talismn/balances"
import { githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"

import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { chaindataProvider } from "../../rpcs/chaindata"
import { updateAndWaitForUpdatedChaindata } from "../../rpcs/mini-metadata-updater"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port, RequestIdOnly } from "../../types/base"
import { assetDiscoveryScanner } from "../assetDiscovery/scanner"
import { activeTokensStore } from "./store.activeTokens"
import { CustomEvmTokenCreate } from "./types"

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
      case "pri(tokens.subscribe)": {
        // TODO: Run this on a timer or something instead of when subscribing to tokens
        await updateAndWaitForUpdatedChaindata({ updateSubstrateChains: true })

        // triggers a pending scan if any
        // doing this here as this is the only place where we hydrate tokens from github
        assetDiscoveryScanner.startPendingScan()

        return true
      }

      // --------------------------------------------------------------------
      // ERC20 token handlers -----------------------------------------------
      // --------------------------------------------------------------------

      case "pri(tokens.evm.custom.add)": {
        const token = request as CustomEvmTokenCreate
        const networkId = token.chainId || token.evmNetworkId
        assert(networkId, "A chainId or an evmNetworkId is required")
        const chain = token.chainId ? await chaindataProvider.chainById(token.chainId) : undefined
        const evmNetwork = token.evmNetworkId
          ? await chaindataProvider.evmNetworkById(token.evmNetworkId)
          : undefined
        assert(typeof token.type === "string", "A token type is required")
        assert(typeof token.contractAddress === "string", "A contract address is required")
        if (token.type === "evm-uniswapv2") {
          assert(typeof token.tokenAddress0 === "string", "A tokenAddress0 is required")
          assert(typeof token.tokenAddress1 === "string", "A tokenAddress1 is required")
          assert(typeof token.symbol0 === "string", "A token0 symbol is required")
          assert(typeof token.symbol1 === "string", "A token1 symbol is required")
          assert(typeof token.decimals0 === "number", "A number of token0 decimals is required")
          assert(typeof token.decimals1 === "number", "A number of token1 decimals is required")
        }
        assert(typeof token.symbol === "string", "A token symbol is required")
        assert(typeof token.decimals === "number", "A number of token decimals is required")

        const tokenId = (() => {
          if (token.type === "evm-erc20") return evmErc20TokenId(networkId, token.contractAddress)
          if (token.type === "evm-uniswapv2")
            return evmUniswapV2TokenId(networkId, token.contractAddress)

          return
        })()
        assert(typeof tokenId === "string", "A token id is required")
        const existing = await chaindataProvider.tokenById(tokenId)
        assert(!existing, "This token already exists")

        const newToken: CustomEvmErc20Token | CustomEvmUniswapV2Token | undefined = (() => {
          if (token.type === "evm-erc20")
            return {
              id: tokenId,
              type: "evm-erc20",
              isTestnet: (chain || evmNetwork)?.isTestnet || false,
              symbol: token.symbol,
              decimals: Number(token.decimals), // some dapps (ie moonriver.moonscan.io) may send a string here, which breaks balances
              logo: token.image || githubUnknownTokenLogoUrl,
              coingeckoId: token.coingeckoId,
              contractAddress: token.contractAddress,
              evmNetwork: token.evmNetworkId ? { id: token.evmNetworkId } : null,
              isCustom: true,
              image: token.image,
            }

          if (token.type === "evm-uniswapv2")
            return {
              id: tokenId,
              type: "evm-uniswapv2",
              isTestnet: (chain || evmNetwork)?.isTestnet || false,
              symbol: token.symbol,
              decimals: Number(token.decimals), // some dapps (ie moonriver.moonscan.io) may send a string here, which breaks balances
              logo: token.image || githubUnknownTokenLogoUrl,
              symbol0: token.symbol0,
              decimals0: token.decimals0,
              symbol1: token.symbol1,
              decimals1: token.decimals1,
              contractAddress: token.contractAddress,
              tokenAddress0: token.tokenAddress0,
              tokenAddress1: token.tokenAddress1,
              coingeckoId0: token.coingeckoId0,
              coingeckoId1: token.coingeckoId1,
              evmNetwork: token.evmNetworkId ? { id: token.evmNetworkId } : null,
              isCustom: true,
              image: token.image,
            }

          return
        })()
        assert(newToken !== undefined, "Invalid token")

        talismanAnalytics.capture(
          `${existing ? "update" : "add"} custom ${
            token.type === "evm-uniswapv2"
              ? "UNIV2"
              : token.type === "evm-erc20"
              ? "ERC20"
              : "unknown"
          } token`,
          {
            evmNetworkId: token.evmNetworkId,
            symbol: token.symbol,
            contractAddress: token.contractAddress,
          }
        )

        const newTokenId = await chaindataProvider.addCustomToken(newToken)

        if (newTokenId) await activeTokensStore.setActive(newTokenId, true)

        return newTokenId
      }

      case "pri(tokens.evm.custom.remove)": {
        const { id } = request as RequestIdOnly
        await activeTokensStore.resetActive(id)
        return chaindataProvider.removeCustomToken(id)
      }
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
