import { chaindataProvider } from "@core/rpcs/chaindata"

// TODO: Refactor any code which uses this store to directly
//       call methods on `chaindataProvider` instead!
// TODO: Refactor any code which uses the db at:
//       `import { db } from "@core/db"`
//       to call methods on `chaindataProvider` instead!
export class TokenStore {
  async clearCustom(): Promise<void> {
    return await chaindataProvider.clearCustomTokens()
  }

  async hydrateStore(): Promise<boolean> {
    return await chaindataProvider.hydrateTokens()
  }
}

// const tokensResponseTypeMap = {
//   NativeToken: "native",
//   OrmlToken: "orml",
//   // LiquidCrowdloanToken: "lc",
//   // LiquidityProviderToken: "lp",
//   // XcToken: "xc",
//   Erc20Token: "erc20",
// } as const
// type TokensResponseTypeMap = typeof tokensResponseTypeMap
// type TokensResponseType = keyof TokensResponseTypeMap
// const isTokenType = (type?: string): type is TokensResponseType =>
//   typeof type === "string" && Object.keys(tokensResponseTypeMap).includes(type)

// /**
//  * Helper function to convert tokensQuery response into a `TokenList`.
//  */
// export const tokensResponseToTokenList = (tokens: unknown[]): TokenList =>
//   tokens.reduce(
//     // TODO: Fix `token` type after https://github.com/subsquid/squid/issues/41 is merged
//     (allTokens: TokenList, token: any) => {
//       if (typeof token?.id !== "string") return allTokens

//       const tokenType = token?.squidImplementationDetail?.__typename
//       if (!isTokenType(tokenType)) return allTokens

//       const commonTokenFields = <T extends TokensResponseType>(
//         token: any,
//         tokenType: T
//       ): IToken & { type: TokensResponseTypeMap[T] } => ({
//         id: token.id,
//         type: tokensResponseTypeMap[tokenType],
//         isTestnet: token.squidImplementationDetail.isTestnet,
//         symbol: token.squidImplementationDetail.symbol,
//         decimals: token.squidImplementationDetail.decimals,
//         coingeckoId: token.squidImplementationDetail.coingeckoId,
//         rates: token.squidImplementationDetail.rates,
//       })

//       switch (tokenType) {
//         case "NativeToken": {
//           const nativeToken: NativeToken = {
//             ...commonTokenFields(token, tokenType),
//             existentialDeposit: token.squidImplementationDetail.existentialDeposit,
//             chain: token.squidImplementationDetailNativeToChains[0],
//             evmNetwork: token.squidImplementationDetailNativeToEvmNetworks[0],
//           }
//           return { ...allTokens, [nativeToken.id]: nativeToken }
//         }

//         case "OrmlToken": {
//           const ormlToken: OrmlToken = {
//             ...commonTokenFields(token, tokenType),
//             existentialDeposit: token.squidImplementationDetail.existentialDeposit,
//             stateKey: token.squidImplementationDetail.stateKey,
//             chain: token.squidImplementationDetail.chain,
//           }
//           return { ...allTokens, [ormlToken.id]: ormlToken }
//         }

//         case "Erc20Token": {
//           const erc20Token: Erc20Token = {
//             ...commonTokenFields(token, tokenType),
//             contractAddress: token.squidImplementationDetail.contractAddress,
//             chain: token.squidImplementationDetail.chain,
//             evmNetwork: token.squidImplementationDetail.evmNetwork,
//           }
//           return { ...allTokens, [erc20Token.id]: erc20Token }
//         }

//         default:
//           return allTokens
//       }
//     },
//     {}
//   )

// export const tokensQuery = gql`
//   {
//     tokens(orderBy: id_ASC) {
//       ...Token
//     }
//   }
//   ${TokenFragment}
// `

// const tokenStore = new TokenStore()
// export default tokenStore
export const tokenStore = new TokenStore()
