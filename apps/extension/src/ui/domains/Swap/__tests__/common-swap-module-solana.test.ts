import type { Account } from "@core/domains/keyring/exports"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock isSolanaAddress — also affects isAccountPlatformSolana which delegates to it
vi.mock("@talismn/crypto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/crypto")>()),
  isSolanaAddress: vi.fn(),
}))

import { isSolanaAddress } from "@talismn/crypto"

import { getTokenIdForSwappableAsset, validateAddress } from "../swap-modules/common.swap-module"

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getTokenIdForSwappableAsset (solana)", () => {
  it("returns native token id when no contractAddress", () => {
    expect(getTokenIdForSwappableAsset("solana", "solana-mainnet")).toBe(
      "solana-mainnet:sol-native"
    )
  })

  it("returns SPL token id when contractAddress provided", () => {
    expect(getTokenIdForSwappableAsset("solana", "solana-mainnet", USDC_MINT)).toBe(
      `solana-mainnet:sol-spl:${USDC_MINT}`
    )
  })

  it("returns native token id when contractAddress is explicit undefined", () => {
    expect(getTokenIdForSwappableAsset("solana", "solana-mainnet", undefined)).toBe(
      "solana-mainnet:sol-native"
    )
  })
})

describe("validateAddress (solana)", () => {
  it("returns true for a valid solana address", () => {
    vi.mocked(isSolanaAddress).mockReturnValue(true)

    expect(
      validateAddress(undefined, "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV", undefined, "solana")
    ).toBe(true)
    expect(isSolanaAddress).toHaveBeenCalledWith("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV")
  })

  it("returns false for an invalid solana address", () => {
    vi.mocked(isSolanaAddress).mockReturnValue(false)

    expect(validateAddress(undefined, "not-a-valid-address", undefined, "solana")).toBe(false)
    expect(isSolanaAddress).toHaveBeenCalledWith("not-a-valid-address")
  })

  it("returns true when account is a solana platform account", () => {
    vi.mocked(isSolanaAddress).mockReturnValue(true)
    const solanaAccount = { address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" } as Account

    expect(validateAddress(solanaAccount, "any", undefined, "solana")).toBe(true)
    expect(isSolanaAddress).toHaveBeenCalledWith("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV")
  })

  it("returns false when account is not a solana platform account", () => {
    vi.mocked(isSolanaAddress).mockReturnValue(false)
    const ethAccount = { address: "0xabc" } as Account

    expect(validateAddress(ethAccount, "any", undefined, "solana")).toBe(false)
    expect(isSolanaAddress).toHaveBeenCalledWith("0xabc")
  })
})
