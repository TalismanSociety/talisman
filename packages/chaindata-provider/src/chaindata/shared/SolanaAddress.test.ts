import { describe, expect, it } from "vitest"

import { SolSplTokenSchema } from "../tokens"
import { SolanaAddressSchema } from "./SolanaAddress"

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
