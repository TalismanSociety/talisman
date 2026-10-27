import { describe, expect, it } from "vitest"

import { makeDotNetwork, makeEvmNativeToken } from "../../__fixtures__/chaindata"
import { DotNetworkSchema } from "../networks"
import { EvmNativeTokenSchema, SolSplTokenSchema } from "../tokens"
import { DecimalsSchema } from "./Decimals"
import { EthereumAddressSchema } from "./EthereumAddress"
import { SolanaAddressSchema } from "./SolanaAddress"

describe("DecimalsSchema", () => {
  it.each([0, 6, 18, 27, 36])("accepts %i", (decimals) => {
    expect(DecimalsSchema.safeParse(decimals).success).toBe(true)
  })

  it.each([37, 255, -1, 1.5])("rejects %d", (decimals) => {
    expect(DecimalsSchema.safeParse(decimals).success).toBe(false)
  })

  it("bounds token decimals", () => {
    expect(EvmNativeTokenSchema.safeParse(makeEvmNativeToken({ decimals: 36 })).success).toBe(true)
    expect(EvmNativeTokenSchema.safeParse(makeEvmNativeToken({ decimals: 255 })).success).toBe(
      false
    )
  })

  it("bounds a network's native currency decimals", () => {
    const network = makeDotNetwork()
    const withDecimals = (decimals: number) => ({
      ...network,
      nativeCurrency: { ...network.nativeCurrency, decimals },
    })

    expect(DotNetworkSchema.safeParse(withDecimals(36)).success).toBe(true)
    expect(DotNetworkSchema.safeParse(withDecimals(255)).success).toBe(false)
  })
})

describe("SolanaAddressSchema", () => {
  it.each([
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
    "11111111111111111111111111111111", // system program: each leading 1 is a zero byte
    "So11111111111111111111111111111111111111112", // wrapped SOL mint
  ])("accepts %s", (address) => {
    expect(SolanaAddressSchema.safeParse(address).success).toBe(true)
  })

  it.each([
    ["32 base58 characters that decode to fewer than 32 bytes", "2".repeat(32)],
    ["44 base58 characters that decode to more than 32 bytes", "z".repeat(44)],
    ["characters outside the base58 alphabet", "0OIl-invalid-charset"],
  ])("rejects %s", (_label, address) => {
    expect(SolanaAddressSchema.safeParse(address).success).toBe(false)
  })

  it("applies to SPL token mints", () => {
    const token = {
      id: "solana:sol-spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      networkId: "solana",
      type: "sol-spl",
      platform: "solana",
      decimals: 6,
      symbol: "USDC",
    }

    expect(
      SolSplTokenSchema.safeParse({
        ...token,
        mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      }).success
    ).toBe(true)
    expect(SolSplTokenSchema.safeParse({ ...token, mintAddress: "2".repeat(32) }).success).toBe(
      false
    )
  })
})

describe("EthereumAddressSchema", () => {
  it("accepts 20-byte hex addresses in any case, without requiring an EIP-55 checksum", () => {
    expect(EthereumAddressSchema.safeParse(`0x${"ab".repeat(20)}`).success).toBe(true)
    expect(EthereumAddressSchema.safeParse(`0x${"AB".repeat(20)}`).success).toBe(true)
    expect(
      EthereumAddressSchema.safeParse("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48").success
    ).toBe(true)
  })

  it.each([
    ["19 bytes", `0x${"ab".repeat(19)}`],
    ["21 bytes", `0x${"ab".repeat(21)}`],
    ["no 0x prefix", "ab".repeat(20)],
    ["non-hex characters", `0x${"zz".repeat(20)}`],
  ])("rejects %s", (_label, address) => {
    expect(EthereumAddressSchema.safeParse(address).success).toBe(false)
  })
})
