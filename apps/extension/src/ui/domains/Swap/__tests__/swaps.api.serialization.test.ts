import { describe, expect, it } from "vitest"

import type { SupportedSwapProtocol } from "../swap-modules/common.swap-module"
import {
  deserializeAssetRegistry,
  deserializeSafeTokens,
  getUniswapSafeTokenKey,
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
})
