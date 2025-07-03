import { githubChaindataBaseUrl, githubChaindataTokensAssetsDir } from "./constants"

type KNOWN_TOKEN_ID = "uniswap"

export const getGithubTokenLogoUrl = (tokenId: KNOWN_TOKEN_ID): string => {
  return `${githubChaindataBaseUrl}/${githubChaindataTokensAssetsDir}/${tokenId}.svg`
}

/**
 * Use only if you are sure this token is supported by Talisman or the url might 404
 * @param coingeckoId
 * @returns
 */
export const getGithubTokenLogoUrlByCoingeckoId = (coingeckoId: string): string => {
  return `${githubChaindataBaseUrl}/assets/tokens/coingecko/${coingeckoId}.webp`
}
