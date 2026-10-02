import { describe, expect, it } from "vitest"

import { addressFormatOf, swapOfTransaction } from "./funds"
import { symbolForAnalytics } from "./schema"

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

describe("addressFormatOf", () => {
  it("reads the encoding from the address, as mobile's <encoding>:<format>", () => {
    expect(addressFormatOf("0x1111111111111111111111111111111111111111")).toBe("ethereum:standard")
    expect(addressFormatOf("5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP", true)).toBe(
      "ss58:legacy"
    )
    expect(addressFormatOf("not an address")).toBe("unknown:standard")
  })
})

describe("symbolForAnalytics", () => {
  it("keeps a symbol the catalogue accepts and reads any other as unknown", () => {
    expect(symbolForAnalytics("USDC.e")).toBe("USDC.e")
    expect(symbolForAnalytics("SN 12 alpha")).toBe("unknown")
    expect(symbolForAnalytics(undefined)).toBe("unknown")
  })
})
