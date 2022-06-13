import { DEBUG } from "@core/constants"
import { Erc20Token, IToken, NativeToken, OrmlToken, Token, TokenList } from "@core/types"
import { TokenFragment, graphqlUrl } from "@core/util/graphql"
import { print } from "graphql"
import gql from "graphql-tag"
import { db } from "@core/libs/db"

const minimumHydrationInterval = 300_000 // 300_000ms = 300s = 5 minutes

export class TokenStore {
  #lastHydratedAt: number = 0

  async clearCustom(): Promise<void> {
    await db.transaction("rw", db.tokens, () => {
      db.tokens.filter((token) => "isCustom" in token && token.isCustom === true).delete()
    })
  }

  async replaceChaindata(tokens: Token[]): Promise<void> {
    await db.transaction("rw", db.tokens, () => {
      db.tokens.filter((token) => !("isCustom" in token)).delete()
      db.tokens.bulkPut(tokens)
    })
  }

  /**
   * Hydrate the store with the latest tokens from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the store has been hydrated, or false if the hydration was skipped.
   */
  async hydrateStore(): Promise<boolean> {
    const now = Date.now()
    if (now - this.#lastHydratedAt < minimumHydrationInterval) return false

    try {
      const { data } = await (
        await fetch(graphqlUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: print(tokensQuery) }),
        })
      ).json()

      const tokensList = tokensResponseToTokenList(data?.tokens || [])

      if (Object.keys(tokensList).length <= 0)
        throw new Error("Ignoring empty chaindata tokens response")

      await this.replaceChaindata(Object.values(tokensList))
      this.#lastHydratedAt = now

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      DEBUG && console.error(error)

      return false
    }
  }
}

const tokensResponseTypeMap = {
  NativeToken: "native",
  OrmlToken: "orml",
  // LiquidCrowdloanToken: "lc",
  // LiquidityProviderToken: "lp",
  // XcToken: "xc",
  Erc20Token: "erc20",
} as const
type TokensResponseTypeMap = typeof tokensResponseTypeMap
type TokensResponseType = keyof TokensResponseTypeMap
const isTokenType = (type?: string): type is TokensResponseType =>
  typeof type === "string" && Object.keys(tokensResponseTypeMap).includes(type)

/**
 * Helper function to convert tokensQuery response into a `TokenList`.
 */
const tokensResponseToTokenList = (tokens: unknown[]): TokenList =>
  tokens.reduce(
    // TODO: Fix `token` type after https://github.com/subsquid/squid/issues/41 is merged
    (allTokens: TokenList, token: any) => {
      if (typeof token?.id !== "string") return allTokens

      const tokenType = token?.squidImplementationDetail?.__typename
      if (!isTokenType(tokenType)) return allTokens

      const commonTokenFields = <T extends TokensResponseType>(
        token: any,
        tokenType: T
      ): IToken & { type: TokensResponseTypeMap[T] } => ({
        id: token.id,
        type: tokensResponseTypeMap[tokenType],
        isTestnet: token.squidImplementationDetail.isTestnet,
        symbol: token.squidImplementationDetail.symbol,
        decimals: token.squidImplementationDetail.decimals,
        coingeckoId: token.squidImplementationDetail.coingeckoId,
        rates: token.squidImplementationDetail.rates,
      })

      switch (tokenType) {
        case "NativeToken":
          const nativeToken: NativeToken = {
            ...commonTokenFields(token, tokenType),
            existentialDeposit: token.squidImplementationDetail.existentialDeposit,
            chain: token.squidImplementationDetailNativeToChains[0],
            evmNetwork: token.squidImplementationDetailNativeToEvmNetworks[0],
          }
          return { ...allTokens, [nativeToken.id]: nativeToken }

        case "OrmlToken":
          const ormlToken: OrmlToken = {
            ...commonTokenFields(token, tokenType),
            existentialDeposit: token.squidImplementationDetail.existentialDeposit,
            index: token.squidImplementationDetail.index,
            chain: token.squidImplementationDetail.chain,
          }
          return { ...allTokens, [ormlToken.id]: ormlToken }

        case "Erc20Token":
          const erc20Token: Erc20Token = {
            ...commonTokenFields(token, tokenType),
            contractAddress: token.squidImplementationDetail.contractAddress,
            chain: token.squidImplementationDetail.chain,
            evmNetwork: token.squidImplementationDetail.evmNetwork,
          }
          return { ...allTokens, [erc20Token.id]: erc20Token }

        default:
          return allTokens
      }
    },
    {}
  )

export const tokensQuery = gql`
  {
    tokens(orderBy: id_ASC) {
      ...Token
    }
  }
  ${TokenFragment}
`

const tokenStore = new TokenStore()
export default tokenStore
