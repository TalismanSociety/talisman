import { Token } from "@talismn/chaindata-provider"
import { Chain } from "extension-core"
import { log } from "extension-shared"
import { isEqual } from "lodash"
import { Enum } from "polkadot-api"

const normalizeTokenId = (tokenId: unknown) => {
  if (typeof tokenId === "string" && tokenId.startsWith("{") && tokenId.endsWith("}"))
    tokenId = JSON.parse(tokenId)
  if (typeof tokenId === "object") {
    // some property names don't have the same case in chaindata. ex: vsKSM
    return Object.entries(tokenId as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        // papi explicitely adds an undefined property for enum entries that have no value => ignore those
        if (value !== undefined)
          acc[key.toLowerCase()] =
            typeof value === "string" ? value.toLowerCase() : normalizeTokenId(value)
        return acc
      },
      {} as Record<string, unknown>,
    )
  }
  return tokenId
}

const isSameTokenId = (tokenId1: unknown, tokenId2: unknown) => {
  tokenId1 = normalizeTokenId(tokenId1)
  tokenId2 = normalizeTokenId(tokenId2)
  return isEqual(tokenId1, tokenId2)
}

type SubstrateTokenId = Enum<Record<string, unknown>>
// ex:
// - "{\"type\":\"Token\",\"value\":{\"type\":\"DOT\"}}"
// - "{\"type\":\"Token2\",\"value\":4}"
// - "{\"type\":\"ForeignAsset\",\"value\":3}"

export const getTokenFromCurrency = (
  currencyId: number | SubstrateTokenId,
  chain: Chain,
  tokens: Token[],
): Token => {
  const chainTokens = tokens.filter((t) => t.chain?.id === chain.id)

  try {
    // ex: HDX
    if (typeof currencyId === "number") {
      if (currencyId === 0) return chainTokens.find((t) => t.id === chain.nativeToken?.id) as Token
      const token = chainTokens.find(
        (t) => t.type === "substrate-tokens" && String(t.onChainId) === String(currencyId),
      )
      if (token) return token
      log.warn("unknown currencyId %d on chain %s", currencyId, chain.id)

      throw new Error("Token not found")
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenSymbol = (currencyId.value as any)?.type?.toLowerCase()

    // FAFO mastery
    const token = chainTokens.find(
      (t) =>
        (t.type === "substrate-native" &&
          (currencyId.type === "Native" || // INTR
            tokenSymbol === t.symbol.toLowerCase())) || // ACA
        (t.type === "substrate-tokens" &&
          (isSameTokenId(t.onChainId, currencyId) || // ex: vsKSM
            t.onChainId?.toString()?.toLowerCase() === currencyId?.toString().toLowerCase())), // ex: aUSD
    )
    if (token) return token

    throw new Error("Token not found")
  } catch (err) {
    log.debug("getTokenFromCurrency", { currencyId, chain, tokens, err })
    throw err
  }
}
