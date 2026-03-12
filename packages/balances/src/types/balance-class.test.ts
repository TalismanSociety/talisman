import { describe, expect, it } from "vitest"
import {
  Balance,
  excludeFromFeePayableLocks,
  excludeFromTransferableAmount,
  filterMirrorTokens,
  getBalanceId,
  type HydrateDb,
  includeInTotalExtraAmount,
} from "./balances"
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

function makeBalance(address: string, tokenId: string, value = "1000000000000"): Balance {
  return new Balance(makeBalanceJson({ address, tokenId, value }))
}

/** Create a mock formatted lock for `excludeFromTransferableAmount` */
const mockLock = (planck: bigint, includeInTransferable = false) => ({
  type: "locked" as const,
  label: "test-lock",
  // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
  amount: { planck, tokens: "0", fiat: () => null, toJSON: () => planck.toString() } as any,
  includeInTransferable,
})

/** Create a mock formatted extra for `includeInTotalExtraAmount` */
const mockExtra = (planck: bigint, includeInTotal = false) => ({
  type: "extra" as const,
  label: "test-extra",
  // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
  amount: { planck, tokens: "0", fiat: () => null, toJSON: () => planck.toString() } as any,
  includeInTotal,
})

// ---------------------------------------------------------------------------
// 1. getBalanceId
// ---------------------------------------------------------------------------
describe("getBalanceId", () => {
  it("joins address and tokenId with ::", () => {
    expect(getBalanceId({ address: "0xABC", tokenId: "dot" })).toBe("0xABC::dot")
  })

  it("works with substrate-style addresses", () => {
    const addr = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
    expect(getBalanceId({ address: addr, tokenId: "ksm" })).toBe(`${addr}::ksm`)
  })

  it("works with empty strings", () => {
    expect(getBalanceId({ address: "", tokenId: "" })).toBe("::")
  })
})

// ---------------------------------------------------------------------------
// 2. excludeFromTransferableAmount
// ---------------------------------------------------------------------------
describe("excludeFromTransferableAmount", () => {
  it("returns BigInt of a string input", () => {
    expect(excludeFromTransferableAmount("12345")).toBe(12345n)
  })

  it("returns planck value for a single lock without includeInTransferable", () => {
    const lock = mockLock(500n)
    expect(excludeFromTransferableAmount(lock)).toBe(500n)
  })

  it("returns 0n for a single lock with includeInTransferable=true", () => {
    const lock = mockLock(500n, true)
    expect(excludeFromTransferableAmount(lock)).toBe(0n)
  })

  it("returns max of non-includeInTransferable locks in an array", () => {
    const locks = [mockLock(100n), mockLock(300n), mockLock(200n)]
    expect(excludeFromTransferableAmount(locks)).toBe(300n)
  })

  it("ignores locks with includeInTransferable=true when computing max", () => {
    const locks = [mockLock(100n), mockLock(999n, true), mockLock(200n)]
    expect(excludeFromTransferableAmount(locks)).toBe(200n)
  })

  it("returns 0n for an empty array", () => {
    expect(excludeFromTransferableAmount([])).toBe(0n)
  })
})

// ---------------------------------------------------------------------------
// 3. excludeFromFeePayableLocks
// ---------------------------------------------------------------------------
describe("excludeFromFeePayableLocks", () => {
  it("returns empty array for string input", () => {
    expect(excludeFromFeePayableLocks("999")).toEqual([])
  })

  it("returns empty array for a single lock without excludeFromFeePayable", () => {
    const lock = { type: "locked" as const, label: "staking", amount: "100" }
    // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
    expect(excludeFromFeePayableLocks(lock as any)).toEqual([])
  })

  it("returns the lock when excludeFromFeePayable is true", () => {
    const lock = {
      type: "locked" as const,
      label: "staking",
      amount: "100",
      excludeFromFeePayable: true,
    }
    // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
    const result = excludeFromFeePayableLocks(lock as any)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(lock)
  })

  it("filters array to only locks with excludeFromFeePayable", () => {
    const locks = [
      { type: "locked" as const, label: "a", amount: "10", excludeFromFeePayable: true },
      { type: "locked" as const, label: "b", amount: "20" },
      { type: "locked" as const, label: "c", amount: "30", excludeFromFeePayable: true },
    ]
    // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
    const result = excludeFromFeePayableLocks(locks as any)
    expect(result).toHaveLength(2)
    expect(result.map((l) => l.label)).toEqual(["a", "c"])
  })
})

// ---------------------------------------------------------------------------
// 4. includeInTotalExtraAmount
// ---------------------------------------------------------------------------
describe("includeInTotalExtraAmount", () => {
  it("returns 0n for undefined", () => {
    expect(includeInTotalExtraAmount(undefined)).toBe(0n)
  })

  it("returns 0n for empty array", () => {
    expect(includeInTotalExtraAmount([])).toBe(0n)
  })

  it("returns 0n for extra without includeInTotal", () => {
    expect(includeInTotalExtraAmount(mockExtra(500n, false))).toBe(0n)
  })

  it("returns planck for extra with includeInTotal=true", () => {
    expect(includeInTotalExtraAmount(mockExtra(500n, true))).toBe(500n)
  })

  it("sums only includeInTotal extras", () => {
    const extras = [mockExtra(100n, true), mockExtra(200n, false), mockExtra(300n, true)]
    expect(includeInTotalExtraAmount(extras)).toBe(400n)
  })
})

// ---------------------------------------------------------------------------
// 5. Balance class — accessors
// ---------------------------------------------------------------------------
describe("Balance accessors", () => {
  it("returns correct id, source, status, address, networkId, tokenId", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0xAA",
        tokenId: "tok-1",
        source: "my-source",
        status: "cache",
        networkId: "polkadot",
      })
    )
    expect(b.id).toBe("0xAA::tok-1")
    expect(b.source).toBe("my-source")
    expect(b.status).toBe("cache")
    expect(b.address).toBe("0xAA")
    expect(b.networkId).toBe("polkadot")
    expect(b.tokenId).toBe("tok-1")
  })

  it("token/network/decimals/rates return null without hydration", () => {
    const b = makeBalance("0x01", "tok")
    expect(b.token).toBeNull()
    expect(b.network).toBeNull()
    expect(b.decimals).toBeNull()
    expect(b.rates).toBeNull()
  })

  it("returns correct token/network/decimals/rates after hydration", () => {
    const db: HydrateDb = {
      networks: {
        "test-network": { id: "test-network", name: "Test" },
        // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
      } as any,
      tokens: {
        "tok-1": {
          id: "tok-1",
          type: "substrate-native",
          symbol: "TST",
          decimals: 12,
          networkId: "test-network",
        },
        // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
      } as any,
      tokenRates: {
        "tok-1": { usd: { price: 5.5 } },
        // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
      } as any,
    }
    const b = new Balance(
      makeBalanceJson({ address: "0x01", tokenId: "tok-1", networkId: "test-network" }),
      db
    )
    expect(b.token).toBeTruthy()
    expect(b.token!.symbol).toBe("TST")
    expect(b.network).toBeTruthy()
    expect(b.decimals).toBe(12)
    expect(b.rates).toBeTruthy()
    expect(b.rates!.usd!.price).toBe(5.5)
  })

  it("looks up rates by tokenId from tokenRates db", () => {
    const db: HydrateDb = {
      tokens: {
        mytoken: {
          id: "mytoken",
          type: "substrate-native",
          symbol: "MT",
          decimals: 10,
          networkId: "net",
        },
        // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
      } as any,
      tokenRates: {
        mytoken: { eur: { price: 2.2 } },
        // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
      } as any,
    }
    const b = new Balance(makeBalanceJson({ address: "0x01", tokenId: "mytoken" }), db)
    expect(b.rates!.eur!.price).toBe(2.2)
  })
})

// ---------------------------------------------------------------------------
// 6. Balance class — simple balance (value field)
// ---------------------------------------------------------------------------
describe("Balance — simple balance (value field)", () => {
  const b = makeBalance("0x01", "tok", "5000000000000")

  it("free returns the value", () => {
    expect(b.free.planck).toBe(5000000000000n)
  })

  it("reserved returns 0", () => {
    expect(b.reserved.planck).toBe(0n)
  })

  it("locked returns 0 (no locks)", () => {
    expect(b.locked.planck).toBe(0n)
  })

  it("total = free (no reserved, no extras)", () => {
    expect(b.total.planck).toBe(b.free.planck)
  })

  it("transferable = free (no locks)", () => {
    expect(b.transferable.planck).toBe(b.free.planck)
  })

  it("feePayable = free (no locks)", () => {
    expect(b.feePayable.planck).toBe(b.free.planck)
  })
})

// ---------------------------------------------------------------------------
// 7. Balance class — complex balance (values array)
// ---------------------------------------------------------------------------
describe("Balance — complex balance (values array)", () => {
  it("free sums all free-type values", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "free-1", amount: "100" },
          { type: "free", label: "free-2", amount: "200" },
        ],
      })
    )
    expect(b.free.planck).toBe(300n)
  })

  it("reserved sums all reserved-type values", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "reserved", label: "res-1", amount: "400" },
          { type: "reserved", label: "res-2", amount: "600" },
        ],
      })
    )
    expect(b.reserved.planck).toBe(1000n)
  })

  it("locked = max of locked-type values (NOT sum)", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "locked", label: "lock-a", amount: "300" },
          { type: "locked", label: "lock-b", amount: "500" },
          { type: "locked", label: "lock-c", amount: "100" },
        ],
      })
    )
    expect(b.locked.planck).toBe(500n)
  })

  it("multiple free values are summed", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "a", amount: "10" },
          { type: "free", label: "b", amount: "20" },
          { type: "free", label: "c", amount: "30" },
        ],
      })
    )
    expect(b.free.planck).toBe(60n)
  })

  it("total = free + reserved (no extras, no nompools, no DelegatedStaking)", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "free", amount: "1000" },
          { type: "reserved", label: "reserved", amount: "500" },
        ],
      })
    )
    expect(b.total.planck).toBe(1500n)
  })
})

// ---------------------------------------------------------------------------
// 8. Balance class — transferable (new calculation, default)
// ---------------------------------------------------------------------------
describe("Balance — transferable (new calculation)", () => {
  it("no locks → equals free", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [{ type: "free", label: "free", amount: "1000" }],
      })
    )
    expect(b.transferable.planck).toBe(b.free.planck)
  })

  it("lock smaller than reserved → transferable = free", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "free", amount: "1000" },
          { type: "reserved", label: "reserved", amount: "500" },
          { type: "locked", label: "lock", amount: "300" },
        ],
      })
    )
    // untouchable = max(300 - 500, 0) = 0  →  transferable = 1000
    expect(b.transferable.planck).toBe(1000n)
  })

  it("lock bigger than reserved → transferable = free - (lock - reserved)", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "free", amount: "1000" },
          { type: "reserved", label: "reserved", amount: "200" },
          { type: "locked", label: "lock", amount: "700" },
        ],
      })
    )
    // untouchable = max(700 - 200, 0) = 500  →  transferable = 1000 - 500 = 500
    expect(b.transferable.planck).toBe(500n)
  })

  it("lock with includeInTransferable=true is ignored in calculation", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "free", amount: "1000" },
          {
            type: "locked",
            label: "big-lock",
            amount: "900",
            includeInTransferable: true,
            // biome-ignore lint/suspicious/noExplicitAny: extra field not in base type
          } as any,
          { type: "locked", label: "small-lock", amount: "100" },
        ],
      })
    )
    // The 900 lock is ignored → only the 100 lock applies
    // untouchable = max(100 - 0, 0) = 100  →  transferable = 1000 - 100 = 900
    expect(b.transferable.planck).toBe(900n)
  })

  it("does not go below 0", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "free", amount: "100" },
          { type: "locked", label: "lock", amount: "9999" },
        ],
      })
    )
    expect(b.transferable.planck).toBe(0n)
  })
})

// ---------------------------------------------------------------------------
// 9. Balance class — transferable (legacy calculation)
// ---------------------------------------------------------------------------
describe("Balance — transferable (legacy calculation)", () => {
  it("no locks → equals free", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        useLegacyTransferableCalculation: true,
        values: [{ type: "free", label: "free", amount: "1000" }],
      })
    )
    expect(b.transferable.planck).toBe(b.free.planck)
  })

  it("with locks → free - maxLock (reserved NOT considered)", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        useLegacyTransferableCalculation: true,
        values: [
          { type: "free", label: "free", amount: "1000" },
          { type: "reserved", label: "reserved", amount: "500" },
          { type: "locked", label: "lock", amount: "300" },
        ],
      })
    )
    // legacy: transferable = free - lock = 1000 - 300 = 700 (reserved is ignored)
    expect(b.transferable.planck).toBe(700n)
  })

  it("doesn't go below 0", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        useLegacyTransferableCalculation: true,
        values: [
          { type: "free", label: "free", amount: "100" },
          { type: "locked", label: "lock", amount: "9999" },
        ],
      })
    )
    expect(b.transferable.planck).toBe(0n)
  })
})

// ---------------------------------------------------------------------------
// 10. Balance class — unavailable
// ---------------------------------------------------------------------------
describe("Balance — unavailable", () => {
  it("new calculation: max(locked, reserved)", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "free", amount: "1000" },
          { type: "reserved", label: "reserved", amount: "200" },
          { type: "locked", label: "lock", amount: "500" },
        ],
      })
    )
    expect(b.unavailable.planck).toBe(500n) // max(500, 200) = 500
  })

  it("new calculation: max(locked, reserved) when reserved > locked", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "free", amount: "1000" },
          { type: "reserved", label: "reserved", amount: "700" },
          { type: "locked", label: "lock", amount: "300" },
        ],
      })
    )
    expect(b.unavailable.planck).toBe(700n) // max(300, 700) = 700
  })

  it("legacy: locked + reserved", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        useLegacyTransferableCalculation: true,
        values: [
          { type: "free", label: "free", amount: "1000" },
          { type: "reserved", label: "reserved", amount: "200" },
          { type: "locked", label: "lock", amount: "500" },
        ],
      })
    )
    expect(b.unavailable.planck).toBe(700n) // 500 + 200
  })

  it("with nompools but no DelegatedStaking hold → adds nompool amounts", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "free", amount: "1000" },
          { type: "locked", label: "staking", amount: "200" },
          { type: "nompool", label: "pool-1", amount: "300", meta: { poolId: 1 } },
          { type: "nompool", label: "pool-2", amount: "100", meta: { poolId: 2 } },
        ],
      })
    )
    // unavailable = max(locked=200, reserved=0) + nompools(300+100) = 200 + 400 = 600
    expect(b.unavailable.planck).toBe(600n)
  })
})

// ---------------------------------------------------------------------------
// 11. Balance class — feePayable
// ---------------------------------------------------------------------------
describe("Balance — feePayable", () => {
  it("no locks → equals free", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [{ type: "free", label: "free", amount: "1000" }],
      })
    )
    expect(b.feePayable.planck).toBe(b.free.planck)
  })

  // BUG: feePayable always equals free even with excludeFromFeePayable locks.
  // The code calls `excludeFromFeePayableLocks(this.locked.planck.toString())`.
  // `.toString()` converts the bigint to a string, so `excludeFromFeePayableLocks`
  // receives a string and returns `[]`, making `excludeAmount` always 0n.
  it("BUG: with locks that have excludeFromFeePayable, feePayable still equals free", () => {
    const b = new Balance(
      makeBalanceJson({
        address: "0x01",
        tokenId: "tok",
        value: undefined,
        values: [
          { type: "free", label: "free", amount: "1000" },
          {
            type: "locked",
            label: "governance",
            amount: "800",
            excludeFromFeePayable: true,
            // biome-ignore lint/suspicious/noExplicitAny: extra field not in base type
          } as any,
        ],
      })
    )
    // BUG: excludeFromFeePayableLocks receives a string ("800") and returns [].
    // So excludeAmount = 0n, and feePayable = free = 1000.
    // Correct behavior would be feePayable = 1000 - 800 = 200.
    expect(b.feePayable.planck).toBe(b.free.planck)
  })
})

// ---------------------------------------------------------------------------
// 12. Balance class — toJSON round-trip
// ---------------------------------------------------------------------------
describe("Balance — toJSON round-trip", () => {
  it("new Balance(json).toJSON() returns the original json", () => {
    const json = makeBalanceJson({ address: "0xAB", tokenId: "tok-x", value: "42" })
    const b = new Balance(json)
    expect(b.toJSON()).toBe(json) // same reference
  })

  it("Balance constructed from BalanceJson can round-trip", () => {
    const json = makeBalanceJson({
      address: "0x01",
      tokenId: "tok",
      value: undefined,
      values: [
        { type: "free", label: "free", amount: "1000" },
        { type: "reserved", label: "reserved", amount: "200" },
      ],
    })
    const b1 = new Balance(json)
    const exported = b1.toJSON()
    const b2 = new Balance(exported)
    expect(b2.id).toBe(b1.id)
    expect(b2.free.planck).toBe(b1.free.planck)
    expect(b2.reserved.planck).toBe(b1.reserved.planck)
    expect(b2.toJSON()).toEqual(exported)
  })
})

// ---------------------------------------------------------------------------
// 13. filterMirrorTokens standalone function
// ---------------------------------------------------------------------------
describe("filterMirrorTokens (standalone)", () => {
  const hydrate: HydrateDb = {
    tokens: {
      "tok-a": {
        id: "tok-a",
        type: "substrate-native",
        symbol: "A",
        decimals: 10,
        networkId: "net",
      },
      "tok-b": {
        id: "tok-b",
        type: "substrate-native",
        symbol: "B",
        decimals: 10,
        networkId: "net",
        mirrorOf: "tok-a",
      },
      "tok-c": {
        id: "tok-c",
        type: "substrate-native",
        symbol: "C",
        decimals: 10,
        networkId: "net",
        mirrorOf: "tok-missing",
      },
      "tok-d": {
        id: "tok-d",
        type: "substrate-native",
        symbol: "D",
        decimals: 10,
        networkId: "net",
      },
    } as unknown as HydrateDb["tokens"],
  }

  function makeHydratedBalance(address: string, tokenId: string): Balance {
    return new Balance(makeBalanceJson({ address, tokenId }), hydrate)
  }

  it("keeps balance when no mirrorOf", () => {
    const ba = makeHydratedBalance("0x01", "tok-a")
    const balances = [ba]
    expect(filterMirrorTokens(ba, 0, balances)).toBe(true)
  })

  it("keeps balance when mirrorOf target is not in the array", () => {
    const bc = makeHydratedBalance("0x01", "tok-c") // mirrorOf: tok-missing
    const balances = [bc]
    expect(filterMirrorTokens(bc, 0, balances)).toBe(true)
  })

  it("filters balance when mirrorOf target IS in the array", () => {
    const ba = makeHydratedBalance("0x01", "tok-a")
    const bb = makeHydratedBalance("0x01", "tok-b") // mirrorOf: tok-a
    const balances = [ba, bb]
    expect(filterMirrorTokens(bb, 1, balances)).toBe(false)
  })

  it("used with Array.filter keeps only non-mirrored balances", () => {
    const ba = makeHydratedBalance("0x01", "tok-a")
    const bb = makeHydratedBalance("0x01", "tok-b") // mirrors tok-a → filtered
    const bd = makeHydratedBalance("0x01", "tok-d") // no mirror → kept
    const balances = [ba, bb, bd]
    const result = balances.filter(filterMirrorTokens)
    expect(result).toHaveLength(2)
    expect(result.map((b) => b.tokenId)).toEqual(["tok-a", "tok-d"])
  })
})
