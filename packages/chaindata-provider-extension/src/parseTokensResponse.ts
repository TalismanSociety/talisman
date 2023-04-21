import { IToken, Token } from "@talismn/chaindata-provider"

type SquidToken = {
  id: string
  data: unknown
}

// TODO: Fix `token` type after https://github.com/subsquid/squid/issues/41 is merged
export const parseTokensResponse = (tokens: SquidToken[]): Token[] =>
  tokens
    .map((token) => token?.data)
    .filter(isITokenPartial)
    .filter(isToken)

export const isITokenPartial = (token: unknown): token is Partial<IToken> =>
  typeof token === "object" && token !== null

export const isToken = (token: Partial<IToken>): token is IToken & Token => {
  const id = token.id
  if (typeof id !== "string") return false

  const type = token.type
  if (typeof type !== "string") return false

  const isTestnet = token.isTestnet
  if (typeof isTestnet !== "boolean") return false

  const symbol = token.symbol
  if (typeof symbol !== "string") return false

  const decimals = token.decimals
  if (typeof decimals !== "number") return false

  const logo = token.logo
  if (typeof logo !== "string") return false

  // coingeckoId can be undefined
  // const coingeckoId = token.coingeckoId
  // if (typeof coingeckoId !== "string") return false

  return true
}
