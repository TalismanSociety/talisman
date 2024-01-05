import { IToken, Token } from "@talismn/chaindata-provider"

// TODO: This is not needed anymore, it is left over from the subsquid->github chaindata migration
export const parseTokensResponse = (tokens: Token[]): Token[] =>
  tokens.filter(isITokenPartial).filter(isToken)

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
