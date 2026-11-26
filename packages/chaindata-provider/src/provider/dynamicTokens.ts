import { type SubDTaoToken, subDTaoTokenId, type Token, type TokenId } from "../chaindata"

/**
 * A dynamic Solana token whose id is also in the curated chaindata. Combined chaindata
 * keeps the last token per id, so such an entry would replace the curated one.
 */
export const isShadowingCuratedToken = (token: Token, curatedTokenIds: Set<TokenId>) =>
  (token.type === "sol-spl" || token.type === "sol-token2022") && curatedTokenIds.has(token.id)

/**
 * Dynamic tokens synced with chaindata:
 * - a per-hotkey dtao token takes the symbol, name, logo and subnet name of its subnet's
 *   token, looked up in `tokensById`. The balance module copies them when it first finds
 *   the position and never rebuilds a token it already knows, so a subnet renamed after
 *   that keeps its old name until it is synced.
 * - a Solana token whose id is now in the curated chaindata is dropped.
 *
 * Returns `dynamicTokens` itself when nothing changed.
 */
export const getSyncedDynamicTokens = (
  dynamicTokens: Token[],
  tokensById: Readonly<Record<TokenId, Token | undefined>>,
  curatedTokenIds: Set<TokenId>
): Token[] => {
  const next: Token[] = []
  let changed = false

  for (const token of dynamicTokens) {
    if (isShadowingCuratedToken(token, curatedTokenIds)) {
      changed = true
      continue
    }

    if (token.type === "substrate-dtao") {
      const template = tokensById[subDTaoTokenId(token.networkId, token.netuid)]
      if (template?.type === "substrate-dtao" && !hasSubnetMetadataOf(token, template)) {
        changed = true
        next.push({
          ...token,
          symbol: template.symbol,
          name: template.name,
          logo: template.logo,
          subnetName: template.subnetName,
        })
        continue
      }
    }

    next.push(token)
  }

  return changed ? next : dynamicTokens
}

/**
 * Compares the fields one by one rather than with a deep equal: a template without a logo
 * gives the copy an explicit `logo: undefined`, which a persisted token loses.
 */
const hasSubnetMetadataOf = (token: SubDTaoToken, template: SubDTaoToken) =>
  token.symbol === template.symbol &&
  token.name === template.name &&
  token.logo === template.logo &&
  token.subnetName === template.subnetName
