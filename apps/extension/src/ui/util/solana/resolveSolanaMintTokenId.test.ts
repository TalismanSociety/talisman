import { solSplTokenId, solToken2022TokenId } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { resolveSolanaMintTokenId } from "./resolveSolanaMintTokenId"

const NETWORK_ID = "solana-mainnet"
const PYUSD_MINT = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo"

const token2022Id = solToken2022TokenId(NETWORK_ID, PYUSD_MINT)
const splId = solSplTokenId(NETWORK_ID, PYUSD_MINT)

describe("resolveSolanaMintTokenId", () => {
  it("resolves a Token-2022 mint when present in the token map", () => {
    const result = resolveSolanaMintTokenId(NETWORK_ID, PYUSD_MINT, {
      [token2022Id]: { id: token2022Id },
    })

    expect(result).toBe(token2022Id)
  })

  it("resolves an SPL mint when present in the token map", () => {
    const result = resolveSolanaMintTokenId(NETWORK_ID, PYUSD_MINT, {
      [splId]: { id: splId },
    })

    expect(result).toBe(splId)
  })

  it("prefers Token-2022 when both token ids are present", () => {
    const result = resolveSolanaMintTokenId(NETWORK_ID, PYUSD_MINT, {
      [splId]: { id: splId },
      [token2022Id]: { id: token2022Id },
    })

    expect(result).toBe(token2022Id)
  })

  it("returns null for unknown mints by default", () => {
    const result = resolveSolanaMintTokenId(NETWORK_ID, PYUSD_MINT, {})

    expect(result).toBeNull()
  })
})
