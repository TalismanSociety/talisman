import { describe, expect, it } from "vitest"

import {
  parseSolToken2022TokenId,
  SolToken2022TokenSchema,
  solToken2022TokenId,
} from "./SolToken2022Token"

describe("solToken2022TokenId", () => {
  it("generates a correctly formatted token ID", () => {
    const id = solToken2022TokenId("solana-mainnet", "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo")
    expect(id).toBe("solana-mainnet:sol-token2022:2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo")
  })
})

describe("parseSolToken2022TokenId", () => {
  it("parses a valid token ID", () => {
    const tokenId =
      "solana-mainnet:sol-token2022:2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo" as const
    const result = parseSolToken2022TokenId(tokenId)
    expect(result).toEqual({
      type: "sol-token2022",
      networkId: "solana-mainnet",
      mintAddress: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
    })
  })

  it("throws for wrong type", () => {
    expect(() =>
      parseSolToken2022TokenId(
        "solana-mainnet:sol-spl:2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo" as never
      )
    ).toThrow("Invalid SolToken2022Token type")
  })

  it("throws for missing mint address", () => {
    expect(() => parseSolToken2022TokenId("solana-mainnet:sol-token2022" as never)).toThrow(
      "Invalid SolToken2022Token ID"
    )
  })
})

describe("SolToken2022TokenSchema", () => {
  it("parses a valid token", () => {
    const token = {
      id: "solana-mainnet:sol-token2022:2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
      type: "sol-token2022",
      platform: "solana",
      networkId: "solana-mainnet",
      mintAddress: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
      symbol: "PYUSD",
      decimals: 6,
      name: "PayPal USD",
    }
    const parsed = SolToken2022TokenSchema.safeParse(token)
    expect(parsed.success).toBe(true)
    expect(parsed.data?.type).toBe("sol-token2022")
  })

  it("parses a token with isTransferable field", () => {
    const token = {
      id: "solana-mainnet:sol-token2022:7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs",
      type: "sol-token2022",
      platform: "solana",
      networkId: "solana-mainnet",
      mintAddress: "7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs",
      symbol: "LOCKED",
      decimals: 9,
      name: "Non-Transferable Token",
      isTransferable: false,
    }
    const parsed = SolToken2022TokenSchema.safeParse(token)
    expect(parsed.success).toBe(true)
    expect(parsed.data?.isTransferable).toBe(false)
  })

  it("rejects a token with wrong type", () => {
    const token = {
      id: "solana-mainnet:sol-spl:SomeMintAddress",
      type: "sol-spl",
      platform: "solana",
      networkId: "solana-mainnet",
      mintAddress: "SomeMintAddress",
      symbol: "TEST",
      decimals: 6,
    }
    const parsed = SolToken2022TokenSchema.safeParse(token)
    expect(parsed.success).toBe(false)
  })
})
