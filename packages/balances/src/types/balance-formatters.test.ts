import { newTokenRates, type TokenRates } from "@talismn/token-rates"
import { describe, expect, it } from "vitest"

import { Balance, BalanceFormatter, Balances, BalanceValueGetter, type HydrateDb } from "./balances"
import type { BalanceJson, IBalance } from "./balancetypes"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBalanceJson(
  overrides: Partial<IBalance> & { address: string; tokenId: string }
): BalanceJson {
  return {
    source: "test-source",
    status: "live",
    networkId: "test-network",
    value: "1000000000000",
    ...overrides,
  } as BalanceJson
}

function makeTokenRates(usdPrice: number, change24h?: number): TokenRates {
  const rates = newTokenRates()
  rates.usd = { price: usdPrice, ...(change24h !== undefined ? { change24h } : {}) }
  return rates
}

function makeHydratedBalance(
  address: string,
  tokenId: string,
  value: string,
  decimals: number,
  rates?: TokenRates
): Balance {
  const json = makeBalanceJson({ address, tokenId, value })
  const b = new Balance(json)
  const db: HydrateDb = {
    tokens: {
      [tokenId]: {
        id: tokenId,
        type: "substrate-native",
        symbol: "T",
        decimals,
        networkId: "test-network",
      },
    } as HydrateDb["tokens"],
    tokenRates: rates ? { [tokenId]: rates } : undefined,
  }
  b.hydrate(db)
  return b
}

// ---------------------------------------------------------------------------
// BalanceFormatter
// ---------------------------------------------------------------------------

describe("BalanceFormatter", () => {
  describe("planck", () => {
    it("returns bigint from string input", () => {
      const f = new BalanceFormatter("12345")
      expect(f.planck).toBe(12345n)
    })

    it("returns bigint from bigint input", () => {
      const f = new BalanceFormatter(99n)
      expect(f.planck).toBe(99n)
    })

    it("defaults to 0n when input is undefined", () => {
      const f = new BalanceFormatter(undefined)
      expect(f.planck).toBe(0n)
    })

    it("handles very large planck values", () => {
      const big = "999999999999999999999999999"
      const f = new BalanceFormatter(big)
      expect(f.planck).toBe(BigInt(big))
    })

    it("handles zero planck", () => {
      const f = new BalanceFormatter("0")
      expect(f.planck).toBe(0n)
    })
  })

  describe("tokens", () => {
    it("with 0 decimals returns planck as string", () => {
      const f = new BalanceFormatter("42", 0)
      expect(f.tokens).toBe("42")
    })

    it("with 10 decimals converts correctly", () => {
      const f = new BalanceFormatter("10000000000", 10)
      expect(f.tokens).toBe("1")
    })

    it("with 12 decimals handles fractional result", () => {
      const f = new BalanceFormatter("1500000000000", 12)
      expect(f.tokens).toBe("1.5")
    })

    it("returns '0' when planck is zero regardless of decimals", () => {
      const f = new BalanceFormatter("0", 10)
      expect(f.tokens).toBe("0")
    })
  })

  describe("fiat", () => {
    it("returns correct fiat value (tokens * rate.price)", () => {
      // 2 tokens at $10 each = 20
      const rates = makeTokenRates(10)
      const f = new BalanceFormatter("2000000000000", 12, rates)
      expect(f.fiat("usd")).toBe(20)
    })

    it("returns null when no token rates provided", () => {
      const f = new BalanceFormatter("1000")
      expect(f.fiat("usd")).toBeNull()
    })

    it("returns null when currency not in rates", () => {
      const rates = makeTokenRates(5)
      // eur is null in our test rates
      const f = new BalanceFormatter("1000000000000", 12, rates)
      expect(f.fiat("eur")).toBeNull()
    })

    it("returns 0 when planck is zero even with rates", () => {
      const rates = makeTokenRates(10)
      const f = new BalanceFormatter("0", 12, rates)
      expect(f.fiat("usd")).toBe(0)
    })
  })

  describe("toJSON", () => {
    it("returns the planck string", () => {
      const f = new BalanceFormatter("12345")
      expect(f.toJSON()).toBe("12345")
    })

    it("returns '0' for undefined input", () => {
      const f = new BalanceFormatter(undefined)
      expect(f.toJSON()).toBe("0")
    })

    it("returns string representation of bigint input", () => {
      const f = new BalanceFormatter(42n)
      expect(f.toJSON()).toBe("42")
    })
  })
})

// ---------------------------------------------------------------------------
// BalanceValueGetter
// ---------------------------------------------------------------------------

describe("BalanceValueGetter", () => {
  const complexStorage: BalanceJson = {
    source: "test-source",
    status: "live",
    address: "0x01",
    tokenId: "token-a",
    networkId: "test-network",
    values: [
      { type: "free", label: "free-balance", amount: "1000" },
      { type: "free", label: "free-staking", amount: "500" },
      { type: "reserved", label: "reserved-balance", amount: "200" },
      { type: "locked", label: "vesting", amount: "100" },
    ],
  }

  describe("get()", () => {
    it("filters values by 'free' type", () => {
      const getter = new BalanceValueGetter(complexStorage)
      const result = getter.get("free")
      expect(result).toHaveLength(2)
      expect(result.every((v) => v.type === "free")).toBe(true)
    })

    it("filters values by 'reserved' type", () => {
      const getter = new BalanceValueGetter(complexStorage)
      const result = getter.get("reserved")
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe("reserved-balance")
    })

    it("filters values by 'locked' type", () => {
      const getter = new BalanceValueGetter(complexStorage)
      const result = getter.get("locked")
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe("vesting")
    })

    it("returns empty array when no values match the type", () => {
      const getter = new BalanceValueGetter(complexStorage)
      expect(getter.get("nompool")).toHaveLength(0)
    })

    it("returns empty array for simple balance (value field, no values array)", () => {
      const simple: BalanceJson = {
        source: "test-source",
        status: "live",
        address: "0x01",
        tokenId: "token-a",
        networkId: "test-network",
        value: "5000",
      }
      const getter = new BalanceValueGetter(simple)
      expect(getter.get("free")).toHaveLength(0)
    })
  })

  describe("add()", () => {
    it("appends to values array", () => {
      const storage: BalanceJson = {
        source: "test-source",
        status: "live",
        address: "0x01",
        tokenId: "token-a",
        networkId: "test-network",
        values: [{ type: "free", label: "balance", amount: "100" }],
      }
      const getter = new BalanceValueGetter(storage)
      getter.add("reserved", { label: "deposit", amount: "50" })
      expect(getter.get("reserved")).toHaveLength(1)
      expect(getter.get("reserved")[0].amount).toBe("50")
    })

    it("does nothing for simple balance with no values array", () => {
      const simple: BalanceJson = {
        source: "test-source",
        status: "live",
        address: "0x01",
        tokenId: "token-a",
        networkId: "test-network",
        value: "5000",
      }
      const getter = new BalanceValueGetter(simple)
      getter.add("free", { label: "extra", amount: "100" })
      // still returns empty because the storage uses `value` not `values`
      expect(getter.get("free")).toHaveLength(0)
    })
  })
})

// ---------------------------------------------------------------------------
// PlanckSumBalancesFormatter (via Balances.sum.planck)
// ---------------------------------------------------------------------------

describe("PlanckSumBalancesFormatter", () => {
  it("sums planck totals across multiple balances", () => {
    // Two simple balances: 1e12 and 2e12 planck, both with 12 decimals
    const b1 = makeHydratedBalance("0x01", "token-a", "1000000000000", 12)
    const b2 = makeHydratedBalance("0x02", "token-b", "2000000000000", 12)
    const balances = new Balances([b1, b2])

    // For simple balances, free == value, total == free + reserved (reserved is 0)
    expect(balances.sum.planck.total).toBe(3000000000000n)
  })

  it("sums planck free values", () => {
    const b1 = makeHydratedBalance("0x01", "token-a", "500", 0)
    const b2 = makeHydratedBalance("0x02", "token-b", "300", 0)
    const balances = new Balances([b1, b2])

    expect(balances.sum.planck.free).toBe(800n)
  })

  it("sums planck transferable values", () => {
    const b1 = makeHydratedBalance("0x01", "token-a", "1000", 0)
    const b2 = makeHydratedBalance("0x02", "token-b", "2000", 0)
    const balances = new Balances([b1, b2])

    // No locks → transferable == free
    expect(balances.sum.planck.transferable).toBe(3000n)
  })

  it("reports reserved as 0n for simple balances", () => {
    const b1 = makeHydratedBalance("0x01", "token-a", "1000", 0)
    const balances = new Balances([b1])
    expect(balances.sum.planck.reserved).toBe(0n)
  })

  it("reports locked as 0n for simple balances with no locks", () => {
    const b1 = makeHydratedBalance("0x01", "token-a", "1000", 0)
    const balances = new Balances([b1])
    expect(balances.sum.planck.locked).toBe(0n)
  })

  it("frozen aliases locked", () => {
    const b1 = makeHydratedBalance("0x01", "token-a", "1000", 0)
    const balances = new Balances([b1])
    expect(balances.sum.planck.frozen).toBe(balances.sum.planck.locked)
  })

  it("returns 0n for empty collection", () => {
    const balances = new Balances([])
    expect(balances.sum.planck.total).toBe(0n)
    expect(balances.sum.planck.free).toBe(0n)
    expect(balances.sum.planck.reserved).toBe(0n)
    expect(balances.sum.planck.locked).toBe(0n)
    expect(balances.sum.planck.transferable).toBe(0n)
    expect(balances.sum.planck.unavailable).toBe(0n)
    expect(balances.sum.planck.feePayable).toBe(0n)
  })

  it("single balance sum equals the individual value", () => {
    const b = makeHydratedBalance("0x01", "token-a", "42", 0)
    const balances = new Balances([b])
    expect(balances.sum.planck.total).toBe(42n)
    expect(balances.sum.planck.free).toBe(42n)
  })

  it("sums locked values (locked = max of locks per balance)", () => {
    const json: BalanceJson = {
      source: "test-source",
      status: "live",
      address: "0x01",
      tokenId: "token-a",
      networkId: "test-network",
      values: [
        { type: "free", label: "free", amount: "1000" },
        { type: "locked", label: "vesting", amount: "300" },
        { type: "locked", label: "staking", amount: "500" },
      ],
    }
    const b = new Balance(json)
    b.hydrate({
      tokens: {
        "token-a": {
          id: "token-a",
          type: "substrate-native",
          symbol: "T",
          decimals: 0,
          networkId: "test-network",
        },
      } as unknown as HydrateDb["tokens"],
    })
    const balances = new Balances([b])
    // locked is max of locks: max(300, 500) = 500
    expect(balances.sum.planck.locked).toBe(500n)
  })
})

// ---------------------------------------------------------------------------
// FiatSumBalancesFormatter (via Balances.sum.fiat)
// ---------------------------------------------------------------------------

describe("FiatSumBalancesFormatter", () => {
  it("sums fiat total with rates", () => {
    // token-a: 1 token at $10 = $10, token-b: 2 tokens at $5 = $10
    const b1 = makeHydratedBalance("0x01", "token-a", "1000000000000", 12, makeTokenRates(10))
    const b2 = makeHydratedBalance("0x02", "token-b", "2000000000000", 12, makeTokenRates(5))
    const balances = new Balances([b1, b2])

    expect(balances.sum.fiat("usd").total).toBe(20)
  })

  it("returns 0 when no token rates", () => {
    const b1 = makeHydratedBalance("0x01", "token-a", "1000000000000", 12)
    const b2 = makeHydratedBalance("0x02", "token-b", "2000000000000", 12)
    const balances = new Balances([b1, b2])

    // fiat returns null per balance → coerced to 0
    expect(balances.sum.fiat("usd").total).toBe(0)
  })

  it("handles mixed: some balances with rates, some without", () => {
    const b1 = makeHydratedBalance("0x01", "token-a", "1000000000000", 12, makeTokenRates(10))
    const b2 = makeHydratedBalance("0x02", "token-b", "2000000000000", 12) // no rates
    const balances = new Balances([b1, b2])

    // Only b1 contributes: 1 token * $10 = $10
    expect(balances.sum.fiat("usd").total).toBe(10)
  })

  it("sums fiat free values", () => {
    const b1 = makeHydratedBalance("0x01", "token-a", "3000000000000", 12, makeTokenRates(2))
    const balances = new Balances([b1])
    // 3 tokens * $2 = $6
    expect(balances.sum.fiat("usd").free).toBe(6)
  })

  it("returns 0 for empty collection", () => {
    const balances = new Balances([])
    expect(balances.sum.fiat("usd").total).toBe(0)
  })

  it("frozen aliases locked", () => {
    const b1 = makeHydratedBalance("0x01", "token-a", "1000", 0, makeTokenRates(1))
    const balances = new Balances([b1])
    expect(balances.sum.fiat("usd").frozen).toBe(balances.sum.fiat("usd").locked)
  })
})

// ---------------------------------------------------------------------------
// Change24hCurrencyFormatter (via Balances.sum.change24h)
// ---------------------------------------------------------------------------

describe("Change24hCurrencyFormatter", () => {
  it("returns { diff, ratio } when change24h data is present", () => {
    // 1 token at $10, change24h = 5 (5%)
    const rates = makeTokenRates(10, 5)
    const b = makeHydratedBalance("0x01", "token-a", "1000000000000", 12, rates)
    const balances = new Balances([b])

    const result = balances.sum.change24h("usd").total
    expect(result).not.toBeNull()
    // fiat = 10, totalFiatDiff = 10 * 5 = 50
    // diff = 50 / 100 = 0.5
    expect(result!.diff).toBe(0.5)
    // ratio = 50 / 10 = 5
    expect(result!.ratio).toBe(5)
  })

  it("returns null when totalFiat is 0 (no fiat rates)", () => {
    const b = makeHydratedBalance("0x01", "token-a", "1000000000000", 12)
    const balances = new Balances([b])

    expect(balances.sum.change24h("usd").total).toBeNull()
  })

  it("returns null when no change24h data on any balance", () => {
    // Rates have price but no change24h
    const rates = makeTokenRates(10)
    const b = makeHydratedBalance("0x01", "token-a", "1000000000000", 12, rates)
    const balances = new Balances([b])

    expect(balances.sum.change24h("usd").total).toBeNull()
  })

  it("handles mixed: some balances with change24h, some without", () => {
    const ratesWithChange = makeTokenRates(10, 5)
    const ratesWithoutChange = makeTokenRates(20)

    const b1 = makeHydratedBalance("0x01", "token-a", "1000000000000", 12, ratesWithChange)
    const b2 = makeHydratedBalance("0x02", "token-b", "1000000000000", 12, ratesWithoutChange)
    const balances = new Balances([b1, b2])

    const result = balances.sum.change24h("usd").total
    expect(result).not.toBeNull()
    // Only b1 contributes: fiat = 10, totalFiatDiff = 10 * 5 = 50
    // But totalFiat only includes balances with change24h → 10
    // diff = 50 / 100 = 0.5, ratio = 50 / 10 = 5
    expect(result!.diff).toBe(0.5)
    expect(result!.ratio).toBe(5)
  })

  it("aggregates multiple balances with change24h", () => {
    const rates1 = makeTokenRates(10, 5) // $10, 5%
    const rates2 = makeTokenRates(20, -2) // $20, -2%

    const b1 = makeHydratedBalance("0x01", "token-a", "1000000000000", 12, rates1)
    const b2 = makeHydratedBalance("0x02", "token-b", "1000000000000", 12, rates2)
    const balances = new Balances([b1, b2])

    const result = balances.sum.change24h("usd").total
    expect(result).not.toBeNull()
    // b1: fiat=10, diff contribution = 10*5 = 50
    // b2: fiat=20, diff contribution = 20*(-2) = -40
    // totalFiatDiff = 50 + (-40) = 10, totalFiat = 10 + 20 = 30
    // diff = 10 / 100 = 0.1
    // ratio = 10 / 30 ≈ 0.333...
    expect(result!.diff).toBeCloseTo(0.1)
    expect(result!.ratio).toBeCloseTo(10 / 30)
  })

  it("returns null for empty collection", () => {
    const balances = new Balances([])
    expect(balances.sum.change24h("usd").total).toBeNull()
  })

  it("only balances with both fiat AND change24h contribute", () => {
    // Balance with change24h but zero fiat value (0 tokens)
    const rates = makeTokenRates(10, 5)
    const b = makeHydratedBalance("0x01", "token-a", "0", 12, rates)
    const balances = new Balances([b])

    // fiat = 0, so fiat is falsy → skipped. totalFiat = 0 → returns null
    expect(balances.sum.change24h("usd").total).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// SumBalancesFormatter
// ---------------------------------------------------------------------------

describe("SumBalancesFormatter", () => {
  it("planck getter returns PlanckSumBalancesFormatter", () => {
    const balances = new Balances([])
    const planckSum = balances.sum.planck
    expect(planckSum.total).toBe(0n)
  })

  it("fiat() returns FiatSumBalancesFormatter", () => {
    const balances = new Balances([])
    const fiatSum = balances.sum.fiat("usd")
    expect(fiatSum.total).toBe(0)
  })

  it("change24h() returns Change24hCurrencyFormatter", () => {
    const balances = new Balances([])
    expect(balances.sum.change24h("usd").total).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Mirror token exclusion in sums
// ---------------------------------------------------------------------------

describe("Mirror token exclusion in sums", () => {
  function makeHydratedMirrorBalance(
    address: string,
    tokenId: string,
    value: string,
    decimals: number,
    mirrorOf?: string,
    rates?: TokenRates
  ): Balance {
    const json = makeBalanceJson({ address, tokenId, value })
    const b = new Balance(json)

    const tokens: Record<string, unknown> = {
      [tokenId]: {
        id: tokenId,
        type: "substrate-native",
        symbol: mirrorOf ? "M" : "T",
        decimals,
        networkId: "test-network",
        ...(mirrorOf ? { mirrorOf } : {}),
      },
    }
    // Also register the mirrored token so filterMirrorTokens sees it
    if (mirrorOf) {
      tokens[mirrorOf] = {
        id: mirrorOf,
        type: "substrate-native",
        symbol: "T",
        decimals,
        networkId: "test-network",
      }
    }

    const db: HydrateDb = {
      tokens: tokens as HydrateDb["tokens"],
      tokenRates: rates
        ? { [tokenId]: rates, ...(mirrorOf ? { [mirrorOf]: rates } : {}) }
        : undefined,
    }
    b.hydrate(db)
    return b
  }

  it("excludes mirror tokens from planck sums", () => {
    // token-a is the real token, token-mirror mirrors token-a
    const real = makeHydratedMirrorBalance("0x01", "token-a", "1000", 0)
    const mirror = makeHydratedMirrorBalance("0x01", "token-mirror", "500", 0, "token-a")
    const balances = new Balances([real, mirror])

    // mirror should be excluded, so total = 1000 (only the real token)
    expect(balances.sum.planck.total).toBe(1000n)
  })

  it("excludes mirror tokens from fiat sums", () => {
    const rates = makeTokenRates(2)
    const real = makeHydratedMirrorBalance("0x01", "token-a", "1000000000000", 12, undefined, rates)
    const mirror = makeHydratedMirrorBalance(
      "0x01",
      "token-mirror",
      "500000000000",
      12,
      "token-a",
      rates
    )
    const balances = new Balances([real, mirror])

    // Only real contributes: 1 token * $2 = $2
    expect(balances.sum.fiat("usd").total).toBe(2)
  })

  it("keeps non-mirror tokens in sum", () => {
    const b1 = makeHydratedMirrorBalance("0x01", "token-a", "100", 0)
    const b2 = makeHydratedMirrorBalance("0x02", "token-b", "200", 0)
    const balances = new Balances([b1, b2])

    // Neither is a mirror, both contribute
    expect(balances.sum.planck.total).toBe(300n)
  })
})
