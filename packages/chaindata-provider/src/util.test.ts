import { describe, expect, it } from "vitest"
import { githubChaindataBaseUrl, githubChaindataTokensAssetsDir } from "./constants"
import { getGithubTokenLogoUrl, getGithubTokenLogoUrlByCoingeckoId } from "./util"

describe("getGithubTokenLogoUrl", () => {
  it("constructs the expected full URL", () => {
    const url = getGithubTokenLogoUrl("uniswap")
    expect(url).toBe(`${githubChaindataBaseUrl}/${githubChaindataTokensAssetsDir}/uniswap.svg`)
  })
})

describe("getGithubTokenLogoUrlByCoingeckoId", () => {
  it("constructs the expected full URL", () => {
    const url = getGithubTokenLogoUrlByCoingeckoId("polkadot")
    expect(url).toBe(`${githubChaindataBaseUrl}/assets/tokens/coingecko/polkadot.webp`)
  })

  it("works with different coingecko IDs", () => {
    const url = getGithubTokenLogoUrlByCoingeckoId("ethereum")
    expect(url).toContain("ethereum.webp")
    expect(url).toContain("/assets/tokens/coingecko/")
  })
})
