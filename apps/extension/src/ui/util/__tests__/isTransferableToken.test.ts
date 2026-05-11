import type { Token } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"
import { isTransferableToken } from "../isTransferableToken"

const makeToken = (overrides: Partial<Token> & { type: Token["type"] }): Token =>
  ({
    id: "solana-mainnet:sol-token2022:SomeMint111111111111111111111111111111111111",
    platform: "solana",
    networkId: "solana-mainnet",
    symbol: "TEST",
    decimals: 6,
    name: "Test Token",
    mintAddress: "SomeMint111111111111111111111111111111111111",
    ...overrides,
  }) as Token

describe("isTransferableToken", () => {
  it("returns true for standard sol-token2022 tokens", () => {
    expect(isTransferableToken(makeToken({ type: "sol-token2022" }))).toBe(true)
  })

  it("returns true when isTransferable is explicitly true", () => {
    expect(
      isTransferableToken(makeToken({ type: "sol-token2022", isTransferable: true } as never))
    ).toBe(true)
  })

  it("returns false for non-transferable sol-token2022 tokens", () => {
    expect(
      isTransferableToken(makeToken({ type: "sol-token2022", isTransferable: false } as never))
    ).toBe(false)
  })

  it("returns true for sol-spl tokens", () => {
    expect(
      isTransferableToken(
        makeToken({
          id: "solana-mainnet:sol-spl:SomeMint111111111111111111111111111111111111" as never,
          type: "sol-spl",
        })
      )
    ).toBe(true)
  })
})
