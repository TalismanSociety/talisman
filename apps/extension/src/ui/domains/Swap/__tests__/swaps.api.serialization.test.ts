import { describe, expect, it } from "vitest"
import type { SupportedSwapProtocol } from "../swap-modules/common.swap-module"
import {
  deserializeAssetRegistry,
  deserializeSafeTokens,
  getUniswapSafeTokenKey,
  getUniswapSafeTokenKeys,
  serializeAssetRegistry,
  serializeSafeTokens,
} from "../swaps.api.serialization"

const getSupportMapSnapshot = (supportMap: Map<string, Set<SupportedSwapProtocol>>) =>
  [...supportMap.entries()].map(([tokenId, protocols]) => [tokenId, [...protocols].sort()])

describe("swaps.api serialization helpers", () => {
  it("round-trips an AssetRegistry through JSON-safe payload", () => {
    const registry = {
      tokenIds: ["1:native:eth", "8453:erc20:0xabc"],
      supportMap: new Map<string, Set<SupportedSwapProtocol>>([
        ["1:native:eth", new Set<SupportedSwapProtocol>(["lifi", "simpleswap"])],
        ["8453:erc20:0xabc", new Set<SupportedSwapProtocol>(["stealthex"])],
      ]),
    }

    const serialized = serializeAssetRegistry(registry)
    const restoredSerialized = JSON.parse(JSON.stringify(serialized))
    const deserialized = deserializeAssetRegistry(restoredSerialized)

    expect(Array.isArray(serialized.supportMapEntries)).toBe(true)
    expect(deserialized.supportMap).toBeInstanceOf(Map)
    expect(deserialized.supportMap.get("1:native:eth")).toBeInstanceOf(Set)
    expect(deserialized.tokenIds).toEqual(registry.tokenIds)
    expect(getSupportMapSnapshot(deserialized.supportMap)).toEqual(
      getSupportMapSnapshot(registry.supportMap)
    )
  })

  it("keys EVM safe tokens by chain id and lowercased address", () => {
    expect(getUniswapSafeTokenKey({ chainId: 1, address: "0xAbC" })).toBe("1:0xabc")
  })

  it("keys Solana safe tokens by network id and case-sensitive mint", () => {
    expect(
      getUniswapSafeTokenKey({
        chainId: 501000101,
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      })
    ).toBe("solana-mainnet:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
  })

  it("round-trips safe tokens through JSON-safe payload", () => {
    const safeTokens = new Set(["1:0xaaa", "42161:0xbbb", "1:0xaaa"])

    const serialized = serializeSafeTokens(safeTokens)
    const restoredSerialized = JSON.parse(JSON.stringify(serialized))
    const deserialized = deserializeSafeTokens(restoredSerialized)

    expect(Array.isArray(serialized)).toBe(true)
    expect(deserialized).toBeInstanceOf(Set)
    expect([...deserialized].sort()).toEqual([...safeTokens].sort())
  })

  describe("getUniswapSafeTokenKeys", () => {
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    const USDC_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

    it("keys the EVM and Solana entries of a token list", () => {
      expect(
        getUniswapSafeTokenKeys({
          tokens: [
            { chainId: 1, address: USDC, symbol: "USDC" },
            { chainId: 501000101, address: USDC_SOLANA, symbol: "USDC" },
          ],
        })
      ).toEqual(new Set([`1:${USDC.toLowerCase()}`, `solana-mainnet:${USDC_SOLANA}`]))
    })

    it("leaves out entries whose chain id or address is malformed", () => {
      expect(
        getUniswapSafeTokenKeys({
          tokens: [
            { chainId: 1, address: USDC },
            null,
            "1:0xabc",
            { chainId: "1", address: USDC },
            { chainId: 0, address: USDC },
            { chainId: 1.5, address: USDC },
            { chainId: 1, address: 42 },
            { chainId: 1, address: "0xabc" },
            { chainId: 1, address: USDC_SOLANA },
            { chainId: 501000101, address: USDC },
          ],
        })
      ).toEqual(new Set([`1:${USDC.toLowerCase()}`]))
    })

    it.each([
      ["an error object", { error: "rate limited" }],
      ["a list with no valid entry", { tokens: [{ chainId: 1, address: "0xabc" }] }],
      ["an empty list", { tokens: [] }],
      ["no body", null],
    ])("throws on %s, so it counts as a failed list", (_, data) => {
      expect(() => getUniswapSafeTokenKeys(data)).toThrow()
    })
  })
})
