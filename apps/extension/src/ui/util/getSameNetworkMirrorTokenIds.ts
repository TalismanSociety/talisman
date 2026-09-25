import type { Token, TokenId } from "@talismn/chaindata-provider"

/** Ids of tokens which are a second view of another listed token's balance, on the same network */
export const getSameNetworkMirrorTokenIds = (tokens: Token[]): Set<TokenId> => {
  const networkIdByTokenId = new Map(tokens.map((token) => [token.id, token.networkId]))

  return new Set(
    tokens
      .filter(
        (token) => token.mirrorOf && networkIdByTokenId.get(token.mirrorOf) === token.networkId
      )
      .map((token) => token.id)
  )
}
