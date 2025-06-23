// import { ExtensionHandler } from "../../libs/Handler"
// import { MessageTypes, RequestTypes, ResponseType } from "../../types"
// import { Port } from "../../types/base"

// export default class TokensHandler extends ExtensionHandler {
//   public async handle<TMessageType extends MessageTypes>(
//     id: string,
//     type: TMessageType,
//     _request: RequestTypes[TMessageType],
//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     port: Port,
//   ): Promise<ResponseType<TMessageType>> {
//     switch (type) {
//       // --------------------------------------------------------------------
//       // token handlers -----------------------------------------------------
//       // --------------------------------------------------------------------
//       // case "pri(tokens.subscribe)": {
//       //   // triggers a pending scan if any
//       //   // TODO: find a better "place" to trigger this
//       //   assetDiscoveryScanner.startPendingScan()

//       //   // this subscription will only close when port is closed
//       //   return genericSubscription(
//       //     id,
//       //     port,
//       //     chaindataProvider.tokensObservable.pipe(distinctUntilChanged<Token[]>(isEqual)),
//       //   )
//       // }

//       // --------------------------------------------------------------------
//       // ERC20 token handlers -----------------------------------------------
//       // --------------------------------------------------------------------

//       case "pri(tokens.evm.custom.add)": {
//         throw new Error("Not implemented")

//         // const token = request as CustomEvmTokenCreate
//         // assert(token.networkId, "A networkId is required")
//         // const network = await chaindataProvider.evmNetworkById(token.networkId)
//         // assert(network, "network not found")
//         // assert(typeof token.type === "string", "A token type is required")
//         // assert(typeof token.contractAddress === "string", "A contract address is required")
//         // if (token.type === "evm-uniswapv2") {
//         //   assert(typeof token.tokenAddress0 === "string", "A tokenAddress0 is required")
//         //   assert(typeof token.tokenAddress1 === "string", "A tokenAddress1 is required")
//         //   assert(typeof token.symbol0 === "string", "A token0 symbol is required")
//         //   assert(typeof token.symbol1 === "string", "A token1 symbol is required")
//         //   assert(typeof token.decimals0 === "number", "A number of token0 decimals is required")
//         //   assert(typeof token.decimals1 === "number", "A number of token1 decimals is required")
//         // }
//         // assert(typeof token.symbol === "string", "A token symbol is required")
//         // assert(typeof token.decimals === "number", "A number of token decimals is required")

//         // const tokenId = (() => {
//         //   if (token.type === "evm-erc20") return evmErc20TokenId(network.id, token.contractAddress)
//         //   if (token.type === "evm-uniswapv2")
//         //     return evmUniswapV2TokenId(network.id, token.contractAddress)

//         //   return
//         // })()
//         // assert(typeof tokenId === "string", "A token id is required")
//         // const existing = await chaindataProvider.tokenById(tokenId)
//         // assert(!existing, "This token already exists")

//         // const newToken: CustomEvmErc20Token | CustomEvmUniswapV2Token | undefined = (() => {
//         //   if (token.type === "evm-erc20")
//         //     return {
//         //       id: tokenId,
//         //       type: "evm-erc20",
//         //       platform: "ethereum",
//         //       isTestnet: !!network.isTestnet,
//         //       symbol: token.symbol,
//         //       name: token.name,
//         //       decimals: Number(token.decimals), // some dapps (ie moonriver.moonscan.io) may send a string here, which breaks balances
//         //       logo: token.logo,
//         //       coingeckoId: token.coingeckoId,
//         //       contractAddress: token.contractAddress,
//         //       networkId: token.networkId,
//         //       isCustom: true,
//         //     }

//         //   if (token.type === "evm-uniswapv2")
//         //     return {
//         //       id: tokenId,
//         //       type: "evm-uniswapv2",
//         //       platform: "ethereum",
//         //       isTestnet: !!network.isTestnet,
//         //       symbol: token.symbol,
//         //       decimals: Number(token.decimals), // some dapps (ie moonriver.moonscan.io) may send a string here, which breaks balances
//         //       name: token.name,
//         //       logo: token.logo,
//         //       symbol0: token.symbol0,
//         //       decimals0: token.decimals0,
//         //       symbol1: token.symbol1,
//         //       decimals1: token.decimals1,
//         //       contractAddress: token.contractAddress,
//         //       tokenAddress0: token.tokenAddress0,
//         //       tokenAddress1: token.tokenAddress1,
//         //       coingeckoId0: token.coingeckoId0,
//         //       coingeckoId1: token.coingeckoId1,
//         //       networkId: token.networkId,
//         //       isCustom: true,
//         //     }

//         //   return
//         // })()
//         // assert(newToken !== undefined, "Invalid token")

//         // talismanAnalytics.capture(
//         //   `${existing ? "update" : "add"} custom ${
//         //     token.type === "evm-uniswapv2"
//         //       ? "UNIV2"
//         //       : token.type === "evm-erc20"
//         //         ? "ERC20"
//         //         : "unknown"
//         //   } token`,
//         //   {
//         //     evmNetworkId: token.networkId,
//         //     symbol: token.symbol,
//         //     contractAddress: token.contractAddress,
//         //   },
//         // )

//         // const newTokenId = await chaindataProvider.addCustomToken(newToken)

//         // if (newTokenId) await activeTokensStore.setActive(newTokenId, true)

//         // return newTokenId
//       }

//       case "pri(tokens.evm.custom.remove)": {
//         throw new Error("Not implemented")
//         // const { id } = request as RequestIdOnly
//         // await activeTokensStore.resetActive(id)
//         // return chaindataProvider.removeCustomToken(id)
//       }
//       default:
//         throw new Error(`Unable to handle message of type ${type}`)
//     }
//   }
// }
