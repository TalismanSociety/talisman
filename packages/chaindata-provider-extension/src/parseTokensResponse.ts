import { IToken, Token } from "@talismn/chaindata-provider"

type SquidToken = {
  id?: string
  data?: IToken & unknown
}

// TODO: Fix `token` type after https://github.com/subsquid/squid/issues/41 is merged
export const parseTokensResponse = (tokens: SquidToken[]): Token[] =>
  tokens
    .map((token) => token?.data)
    .filter((data): data is IToken & unknown => typeof data === "object")
    .filter(isToken)

const isToken = (token: IToken & unknown): token is Token => {
  const id = token.id
  if (typeof id !== "string") return false

  const type = token.type
  if (typeof type !== "string") return false

  const isTestnet = token.isTestnet
  if (typeof isTestnet !== "boolean") return false

  const symbol = token.symbol
  if (typeof symbol !== "string") return false

  const decimals = token.decimals
  if (typeof decimals !== "string") return false

  const coingeckoId = token.coingeckoId
  if (typeof coingeckoId !== "string") return false

  return true
}
