import { describe, expect, it } from "vitest"
import { githubChaindataBaseUrl, githubChaindataTokensAssetsDir } from "./constants"
import { getGithubTokenLogoUrl, getGithubTokenLogoUrlByCoingeckoId } from "./util"

describe("getGithubTokenLogoUrl", () => {
  it("returns a URL containing the token ID with .svg extension", () => {
    const url = getGithubTokenLogoUrl("uniswap")
    expect(url).toContain("uniswap.svg")
  })

  it("returns a URL starting with the GitHub CDN base", () => {
    const url = getGithubTokenLogoUrl("uniswap")
    expect(url.startsWith(githubChaindataBaseUrl)).toBe(true)
  })

  it("returns a URL containing the tokens assets directory", () => {
    const url = getGithubTokenLogoUrl("uniswap")
    expect(url).toContain(githubChaindataTokensAssetsDir)
  })

  it("returns a string", () => {
    expect(typeof getGithubTokenLogoUrl("uniswap")).toBe("string")
  })

  it("returns a well-formed https URL", () => {
    const url = getGithubTokenLogoUrl("uniswap")
    expect(url).toContain("https://")
    expect(url).toMatch(/^https:\/\//)
  })

  it("constructs the expected full URL", () => {
    const url = getGithubTokenLogoUrl("uniswap")
    expect(url).toBe(`${githubChaindataBaseUrl}/${githubChaindataTokensAssetsDir}/uniswap.svg`)
  })
})

describe("getGithubTokenLogoUrlByCoingeckoId", () => {
  it("returns a URL containing the coingecko ID with .webp extension", () => {
    const url = getGithubTokenLogoUrlByCoingeckoId("polkadot")
    expect(url).toContain("polkadot.webp")
  })

  it("returns a URL containing the coingecko assets path", () => {
    const url = getGithubTokenLogoUrlByCoingeckoId("polkadot")
    expect(url).toContain("/assets/tokens/coingecko/")
  })

  it("returns a URL starting with the GitHub CDN base", () => {
    const url = getGithubTokenLogoUrlByCoingeckoId("polkadot")
    expect(url.startsWith(githubChaindataBaseUrl)).toBe(true)
  })

  it("returns a string", () => {
    expect(typeof getGithubTokenLogoUrlByCoingeckoId("polkadot")).toBe("string")
  })

  it("returns a well-formed https URL", () => {
    const url = getGithubTokenLogoUrlByCoingeckoId("polkadot")
    expect(url).toContain("https://")
    expect(url).toMatch(/^https:\/\//)
  })

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
