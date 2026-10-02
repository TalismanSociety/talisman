import type { Network, Token } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import {
  addressFormatOf,
  networkIdForAnalytics,
  swapOfTransaction,
  tokenSymbolForAnalytics,
} from "./funds"

describe("swapOfTransaction", () => {
  const swap = { fromAmount: "1", toAmount: "1", to: "0x1" } as const

  it("names the provider and whether the swap crosses networks", () => {
    expect(
      swapOfTransaction({
        type: "swap-bittensor-evm",
        fromTokenId: "bittensor:substrate-native",
        toTokenId: "964:evm-native",
        ...swap,
      })
    ).toEqual({ protocol: "bittensor-evm", cross_chain: true })
    expect(
      swapOfTransaction({
        type: "swap-lifi",
        protocolName: "uniswap",
        fromTokenId: "1:evm-native",
        toTokenId: "1:evm-erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        ...swap,
      })
    ).toEqual({ protocol: "lifi", cross_chain: false })
  })

  it("is null for any other transaction", () => {
    expect(
      swapOfTransaction({ type: "transfer", tokenId: "1:evm-native", to: "0x1", value: "1" })
    ).toBeNull()
    expect(swapOfTransaction(undefined)).toBeNull()
  })
})

describe("networkIdForAnalytics", () => {
  const network = (id: string, platform: string, isCustom: boolean, isKnown: boolean) =>
    ({ id, platform, __isCustom: isCustom, __isKnown: isKnown }) as unknown as Network

  it("keeps Talisman's id, edited or not, and an Ethereum chain id", () => {
    expect(networkIdForAnalytics(network("polkadot", "polkadot", false, true))).toBe("polkadot")
    expect(networkIdForAnalytics(network("polkadot", "polkadot", true, true))).toBe("polkadot")
    expect(networkIdForAnalytics(network("987654321", "ethereum", true, false))).toBe("987654321")
  })

  it("hides a user-added genesis hash and a missing network", () => {
    expect(networkIdForAnalytics(network(`0x${"ab".repeat(32)}`, "polkadot", true, false))).toBe(
      "custom"
    )
    expect(networkIdForAnalytics(null)).toBe("custom")
  })
})

describe("addressFormatOf", () => {
  it("reads the encoding from the address, as mobile's <encoding>:<format>", () => {
    expect(addressFormatOf("0x1111111111111111111111111111111111111111")).toBe("ethereum:standard")
    expect(addressFormatOf("5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP", true)).toBe(
      "ss58:legacy"
    )
    expect(addressFormatOf("not an address")).toBe("unknown:standard")
  })
})

describe("tokenSymbolForAnalytics", () => {
  const token = (symbol: string, isCustom: boolean, isKnown: boolean) =>
    ({ symbol, __isCustom: isCustom, __isKnown: isKnown }) as unknown as Token

  it("keeps the symbol of a Talisman token", () => {
    expect(tokenSymbolForAnalytics(token("USDC.e", false, true))).toBe("USDC.e")
  })

  it("reads a token whose symbol the user typed, added or edited, as unknown", () => {
    expect(tokenSymbolForAnalytics(token("ALICE", true, false))).toBe("unknown")
    expect(tokenSymbolForAnalytics(token("ALICE", true, true))).toBe("unknown")
  })

  it("reads a symbol the catalogue rejects and no token as unknown", () => {
    expect(tokenSymbolForAnalytics(token("SN 12 alpha", false, true))).toBe("unknown")
    expect(tokenSymbolForAnalytics(null)).toBe("unknown")
  })
})
