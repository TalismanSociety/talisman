import type { TokenRatesList } from "@talismn/token-rates"
import BigNumber from "bignumber.js"
import { describe, expect, it } from "vitest"
import {
  attachFees,
  calculateQuoteFees,
  flattenQuotes,
  type QuoteWithFees,
  selectQuote,
  sortQuotes,
} from "../hooks/quote-sorting"
import type { BaseQuote, SupportedSwapProtocol } from "../swap-modules/common.swap-module"

// ---------------------------------------------------------------------------
// Helpers to build mock quotes
// ---------------------------------------------------------------------------

const makeQuote = (overrides: Partial<BaseQuote> = {}): BaseQuote => ({
  decentralisationScore: 1,
  protocol: "simpleswap",
  outputAmountBN: 1000n,
  inputAmountBN: 500n,
  fees: [],
  timeInSec: 60,
  providerLogo: "",
  providerName: "SimpleSwap",
  ...overrides,
})

const wrap = (quote: BaseQuote, fees = 0): QuoteWithFees => ({ quote, fees })

/** Cast a partial rate map to TokenRatesList – tests only need the `usd.price` path. */
const mockRates = (map: Record<string, { usd?: { price: number } | undefined }>): TokenRatesList =>
  map as unknown as TokenRatesList

// ---------------------------------------------------------------------------
// flattenQuotes
// ---------------------------------------------------------------------------

describe("flattenQuotes", () => {
  it("returns empty array for empty input", () => {
    expect(flattenQuotes([])).toEqual([])
  })

  it("filters out null and undefined results", () => {
    expect(flattenQuotes([null, undefined])).toEqual([])
  })

  it("filters out quotes with outputAmountBN === 0n", () => {
    const q = makeQuote({ outputAmountBN: 0n })
    expect(flattenQuotes([q])).toEqual([])
  })

  it("keeps quotes with positive outputAmountBN", () => {
    const q = makeQuote({ outputAmountBN: 100n })
    expect(flattenQuotes([q])).toEqual([q])
  })

  it("flattens arrays of quotes", () => {
    const q1 = makeQuote({ outputAmountBN: 100n, protocol: "lifi", subProtocol: "uniswap" })
    const q2 = makeQuote({ outputAmountBN: 200n, protocol: "lifi", subProtocol: "sushi" })
    const result = flattenQuotes([[q1, q2]])
    expect(result).toHaveLength(2)
    expect(result).toContain(q1)
    expect(result).toContain(q2)
  })

  it("handles mixed single and array results", () => {
    const single = makeQuote({ outputAmountBN: 50n, protocol: "simpleswap" })
    const arr1 = makeQuote({ outputAmountBN: 100n, protocol: "lifi" })
    const arr2 = makeQuote({ outputAmountBN: 0n, protocol: "lifi" }) // filtered out
    const result = flattenQuotes([single, [arr1, arr2], null])
    expect(result).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// calculateQuoteFees
// ---------------------------------------------------------------------------

describe("calculateQuoteFees", () => {
  it("returns 0 when the quote has no fees", () => {
    const q = makeQuote({ fees: [] })
    expect(calculateQuoteFees(q, mockRates({}))).toBe(0)
  })

  it("calculates fees using token rates", () => {
    const q = makeQuote({
      fees: [
        { name: "network", amount: BigNumber("0.01"), tokenId: "eth-native" },
        { name: "protocol", amount: BigNumber("5"), tokenId: "usdc-token" },
      ],
    })
    const r = mockRates({
      "eth-native": { usd: { price: 3000 } },
      "usdc-token": { usd: { price: 1 } },
    })
    // 0.01 * 3000 + 5 * 1 = 35
    expect(calculateQuoteFees(q, r)).toBe(35)
  })

  it("treats missing token rate as 0", () => {
    const q = makeQuote({
      fees: [{ name: "network", amount: BigNumber("1"), tokenId: "unknown-token" }],
    })
    expect(calculateQuoteFees(q, mockRates({}))).toBe(0)
  })

  it("treats undefined usd price as 0", () => {
    const q = makeQuote({
      fees: [{ name: "network", amount: BigNumber("1"), tokenId: "token-a" }],
    })
    expect(calculateQuoteFees(q, mockRates({ "token-a": { usd: undefined } }))).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// attachFees
// ---------------------------------------------------------------------------

describe("attachFees", () => {
  it("returns empty array for empty quotes", () => {
    expect(attachFees([], mockRates({}))).toEqual([])
  })

  it("attaches computed fees to each quote", () => {
    const q = makeQuote({
      fees: [{ name: "gas", amount: BigNumber("0.001"), tokenId: "eth" }],
    })
    const r = mockRates({ eth: { usd: { price: 2000 } } })
    const result = attachFees([q], r)
    expect(result).toHaveLength(1)
    expect(result[0]!.quote).toBe(q)
    expect(result[0]!.fees).toBe(2) // 0.001 * 2000
  })
})

// ---------------------------------------------------------------------------
// sortQuotes – bestRate
// ---------------------------------------------------------------------------

describe("sortQuotes – bestRate", () => {
  it("sorts by highest outputAmountBN first", () => {
    const low = wrap(makeQuote({ outputAmountBN: 100n, providerName: "Low" }))
    const mid = wrap(makeQuote({ outputAmountBN: 500n, providerName: "Mid" }))
    const high = wrap(makeQuote({ outputAmountBN: 1000n, providerName: "High" }))

    const sorted = sortQuotes([low, high, mid], "bestRate")
    expect(sorted.map((s) => s.quote.providerName)).toEqual(["High", "Mid", "Low"])
  })

  it("preserves order for equal output amounts", () => {
    const a = wrap(makeQuote({ outputAmountBN: 500n, providerName: "A" }))
    const b = wrap(makeQuote({ outputAmountBN: 500n, providerName: "B" }))

    // Array.sort is stable in V8 – order should be preserved
    const sorted = sortQuotes([a, b], "bestRate")
    expect(sorted.map((s) => s.quote.providerName)).toEqual(["A", "B"])
  })

  it("handles very large bigint differences", () => {
    const small = wrap(makeQuote({ outputAmountBN: 1n }))
    const huge = wrap(makeQuote({ outputAmountBN: 10n ** 30n }))

    const sorted = sortQuotes([small, huge], "bestRate")
    expect(sorted[0]!.quote.outputAmountBN).toBe(10n ** 30n)
  })
})

// ---------------------------------------------------------------------------
// sortQuotes – fastest
// ---------------------------------------------------------------------------

describe("sortQuotes – fastest", () => {
  it("sorts by shortest timeInSec first", () => {
    const slow = wrap(makeQuote({ timeInSec: 300, providerName: "Slow" }))
    const fast = wrap(makeQuote({ timeInSec: 10, providerName: "Fast" }))
    const mid = wrap(makeQuote({ timeInSec: 60, providerName: "Mid" }))

    const sorted = sortQuotes([slow, fast, mid], "fastest")
    expect(sorted.map((s) => s.quote.providerName)).toEqual(["Fast", "Mid", "Slow"])
  })
})

// ---------------------------------------------------------------------------
// sortQuotes – cheapest
// ---------------------------------------------------------------------------

describe("sortQuotes – cheapest", () => {
  it("sorts by lowest USD fees first", () => {
    const expensive = wrap(makeQuote({ providerName: "Expensive" }), 50)
    const cheap = wrap(makeQuote({ providerName: "Cheap" }), 2)
    const mid = wrap(makeQuote({ providerName: "Mid" }), 10)

    const sorted = sortQuotes([expensive, cheap, mid], "cheapest")
    expect(sorted.map((s) => s.quote.providerName)).toEqual(["Cheap", "Mid", "Expensive"])
  })

  it("handles quotes with same output but different fees", () => {
    const a = wrap(makeQuote({ outputAmountBN: 1000n, providerName: "A" }), 5)
    const b = wrap(makeQuote({ outputAmountBN: 1000n, providerName: "B" }), 3)
    const c = wrap(makeQuote({ outputAmountBN: 1000n, providerName: "C" }), 10)

    const sorted = sortQuotes([a, b, c], "cheapest")
    expect(sorted.map((s) => s.quote.providerName)).toEqual(["B", "A", "C"])
  })
})

// ---------------------------------------------------------------------------
// sortQuotes – decentralised
// ---------------------------------------------------------------------------

describe("sortQuotes – decentralised", () => {
  it("sorts by highest decentralisationScore first", () => {
    const simpleswap = wrap(
      makeQuote({ decentralisationScore: 1, protocol: "simpleswap", providerName: "SimpleSwap" })
    )
    const stealthex = wrap(
      makeQuote({ decentralisationScore: 1.5, protocol: "stealthex", providerName: "StealthEX" })
    )
    const lifi = wrap(
      makeQuote({ decentralisationScore: 2, protocol: "lifi", providerName: "LI.FI" })
    )

    const sorted = sortQuotes([simpleswap, lifi, stealthex], "decentalised")
    expect(sorted.map((s) => s.quote.providerName)).toEqual(["LI.FI", "StealthEX", "SimpleSwap"])
  })

  it("uses real provider scores (LI.FI=2 > StealthEX=1.5 > SimpleSwap=1)", () => {
    const quotes: QuoteWithFees[] = [
      wrap(makeQuote({ decentralisationScore: 1, providerName: "SimpleSwap" })),
      wrap(makeQuote({ decentralisationScore: 1.5, providerName: "StealthEX" })),
      wrap(makeQuote({ decentralisationScore: 2, providerName: "LI.FI" })),
    ]
    const sorted = sortQuotes(quotes, "decentalised")
    expect(sorted.map((s) => s.quote.decentralisationScore)).toEqual([2, 1.5, 1])
  })
})

// ---------------------------------------------------------------------------
// sortQuotes – edge cases
// ---------------------------------------------------------------------------

describe("sortQuotes – edge cases", () => {
  it("returns empty array when given empty input", () => {
    expect(sortQuotes([], "bestRate")).toEqual([])
  })

  it("returns single element unchanged", () => {
    const only = wrap(makeQuote({ providerName: "Only" }))
    const sorted = sortQuotes([only], "bestRate")
    expect(sorted).toHaveLength(1)
    expect(sorted[0]!.quote.providerName).toBe("Only")
  })

  it("does not mutate the original array", () => {
    const a = wrap(makeQuote({ outputAmountBN: 100n }))
    const b = wrap(makeQuote({ outputAmountBN: 200n }))
    const original = [a, b]
    sortQuotes(original, "bestRate")
    // original order should be unchanged
    expect(original[0]).toBe(a)
    expect(original[1]).toBe(b)
  })

  it("handles quotes with error field (they still sort normally)", () => {
    const errQuote = wrap(
      makeQuote({ outputAmountBN: 500n, error: "rate limit", providerName: "Errored" })
    )
    const goodQuote = wrap(makeQuote({ outputAmountBN: 1000n, providerName: "Good" }))

    const sorted = sortQuotes([errQuote, goodQuote], "bestRate")
    expect(sorted[0]!.quote.providerName).toBe("Good")
    expect(sorted[1]!.quote.providerName).toBe("Errored")
  })
})

// ---------------------------------------------------------------------------
// selectQuote
// ---------------------------------------------------------------------------

describe("selectQuote", () => {
  it("returns null for empty array", () => {
    expect(selectQuote([], null, undefined)).toBeNull()
  })

  it("returns first sorted quote when no protocol is selected", () => {
    const q = makeQuote({ providerName: "First" })
    expect(selectQuote([wrap(q)], null, undefined)).toBe(q)
  })

  it("returns matching protocol quote when selected", () => {
    const simpleswap = wrap(makeQuote({ protocol: "simpleswap", providerName: "SimpleSwap" }))
    const lifi = wrap(makeQuote({ protocol: "lifi", providerName: "LI.FI" }))

    // lifi is first in the sorted list, but user selected simpleswap
    const result = selectQuote([lifi, simpleswap], "simpleswap", undefined)
    expect(result?.providerName).toBe("SimpleSwap")
  })

  it("falls back to first quote when selected protocol is not found", () => {
    const lifi = wrap(makeQuote({ protocol: "lifi", providerName: "LI.FI" }))
    const result = selectQuote([lifi], "stealthex", undefined)
    expect(result?.providerName).toBe("LI.FI")
  })

  it("matches subProtocol when present on the quote", () => {
    const uniswap = wrap(
      makeQuote({ protocol: "lifi", subProtocol: "uniswap", providerName: "Uniswap" })
    )
    const sushi = wrap(makeQuote({ protocol: "lifi", subProtocol: "sushi", providerName: "Sushi" }))

    const result = selectQuote([uniswap, sushi], "lifi", "sushi")
    expect(result?.providerName).toBe("Sushi")
  })

  it("matches protocol without subProtocol check when quote has no subProtocol", () => {
    const simple = wrap(makeQuote({ protocol: "simpleswap", providerName: "SimpleSwap" }))
    // selectedSubProtocol is set but quote has no subProtocol → should still match
    const result = selectQuote([simple], "simpleswap", "anything")
    expect(result?.providerName).toBe("SimpleSwap")
  })

  it("does not match when quote subProtocol differs from selected", () => {
    const uniswap = wrap(
      makeQuote({ protocol: "lifi", subProtocol: "uniswap", providerName: "Uniswap" })
    )
    // Only quote has subProtocol=uniswap but we want sushi → fallback to first
    const result = selectQuote([uniswap], "lifi", "sushi")
    expect(result?.providerName).toBe("Uniswap") // fallback to first
  })
})

// ---------------------------------------------------------------------------
// Integration: full pipeline
// ---------------------------------------------------------------------------

describe("full sorting pipeline", () => {
  it("flattens, attaches fees, sorts by bestRate, and selects top quote", () => {
    const lowOutput = makeQuote({
      outputAmountBN: 100n,
      protocol: "simpleswap",
      providerName: "SimpleSwap",
      fees: [{ name: "network", amount: BigNumber("0.001"), tokenId: "eth" }],
    })
    const highOutput = makeQuote({
      outputAmountBN: 500n,
      protocol: "lifi",
      providerName: "LI.FI",
      fees: [{ name: "gas", amount: BigNumber("0.002"), tokenId: "eth" }],
    })
    const zeroOutput = makeQuote({ outputAmountBN: 0n })

    const r = mockRates({ eth: { usd: { price: 3000 } } })

    const flat = flattenQuotes([lowOutput, [highOutput, zeroOutput], null])
    expect(flat).toHaveLength(2) // zero output filtered out

    const withFees = attachFees(flat, r)
    const sorted = sortQuotes(withFees, "bestRate")

    expect(sorted[0]!.quote.providerName).toBe("LI.FI")
    expect(sorted[0]!.fees).toBe(6) // 0.002 * 3000
    expect(sorted[1]!.quote.providerName).toBe("SimpleSwap")
    expect(sorted[1]!.fees).toBe(3) // 0.001 * 3000

    const selected = selectQuote(sorted, null, undefined)
    expect(selected?.providerName).toBe("LI.FI") // best rate wins
  })

  it("cheapest sorting picks lower-fee quote even with lower output", () => {
    const highOutputHighFee = makeQuote({
      outputAmountBN: 1000n,
      protocol: "lifi" as SupportedSwapProtocol,
      providerName: "LI.FI",
      fees: [{ name: "gas", amount: BigNumber("0.01"), tokenId: "eth" }],
    })
    const lowOutputLowFee = makeQuote({
      outputAmountBN: 900n,
      protocol: "simpleswap" as SupportedSwapProtocol,
      providerName: "SimpleSwap",
      fees: [{ name: "fee", amount: BigNumber("0.001"), tokenId: "eth" }],
    })

    const r = mockRates({ eth: { usd: { price: 3000 } } })
    const flat = flattenQuotes([highOutputHighFee, lowOutputLowFee])
    const withFees = attachFees(flat, r)
    const sorted = sortQuotes(withFees, "cheapest")

    expect(sorted[0]!.quote.providerName).toBe("SimpleSwap") // 0.001*3000=3 < 0.01*3000=30
    expect(sorted[0]!.fees).toBe(3)
    expect(sorted[1]!.fees).toBe(30)
  })
})
