import { quoteFromLegs } from "@core/domains/swaps/helpers"
import type { BaseQuote, SupportedSwapProtocol } from "@core/domains/swaps/types"
import type { TokenRatesList } from "@talismn/token-rates"
import BigNumber from "bignumber.js"
import { describe, expect, it } from "vitest"
import {
  attachFees,
  attachShortfalls,
  calculateQuoteFees,
  flattenQuotes,
  isSelectionAvailable,
  type QuoteWithFees,
  selectQuote,
  sortQuotes,
} from "../hooks/quote-sorting"

// ---------------------------------------------------------------------------
// Helpers to build mock quotes
// ---------------------------------------------------------------------------

const makeQuote = ({
  inputAmountBN = 500n,
  outputAmountBN = 1000n,
  fees = [],
  timeInSec = 60,
  ...presentation
}: Partial<BaseQuote> = {}): BaseQuote =>
  quoteFromLegs(
    [
      {
        protocol: presentation.protocol ?? "simpleswap",
        fromTokenId: "from-token",
        toTokenId: "to-token",
        signer: null,
        recipient: null,
        inputAmount: inputAmountBN,
        outputAmount: outputAmountBN,
        fees,
        timeInSec,
      },
    ],
    {
      decentralisationScore: 1,
      protocol: "simpleswap",
      providerLogo: "",
      providerName: "SimpleSwap",
      ...presentation,
    }
  )

const wrap = (quote: BaseQuote, fees = 0, netUsd: number | null = null): QuoteWithFees => ({
  quote,
  fees,
  netUsd,
  shortfall: null,
})

/** Cast a partial rate map to TokenRatesList – tests only need the `usd.price` path. */
const mockRates = (map: Record<string, { usd?: { price: number } | undefined }>): TokenRatesList =>
  map as unknown as TokenRatesList

// ---------------------------------------------------------------------------
// flattenQuotes
// ---------------------------------------------------------------------------

describe("flattenQuotes", () => {
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

  it("ranks by the USD value delivered less the fees paid on top, when the output has a rate", () => {
    const glacis = makeQuote({
      outputAmountBN: 800n,
      providerName: "Glacis",
      fees: [{ name: "Bridge Fee", amount: BigNumber("0.0195"), tokenId: "eth", additional: true }],
    })
    const stargate = makeQuote({
      outputAmountBN: 795n,
      providerName: "Stargate",
      fees: [{ name: "Gas", amount: BigNumber("0.0001"), tokenId: "eth", gas: true }],
    })
    const across = makeQuote({
      outputAmountBN: 790n,
      providerName: "Across",
      fees: [{ name: "LIFI Fixed Fee", amount: BigNumber("0.01"), tokenId: "eth" }],
    })
    const rates = mockRates({ eth: { usd: { price: 2300 } }, "to-token": { usd: { price: 2.9 } } })

    const sorted = sortQuotes(
      attachFees([glacis, stargate, across], rates, { id: "to-token", decimals: 3 }),
      "bestRate"
    )

    expect(sorted.map((s) => s.quote.providerName)).toEqual(["Across", "Stargate", "Glacis"])
  })

  it("falls back to the output amount when the output token has no rate", () => {
    const glacis = makeQuote({
      outputAmountBN: 800n,
      providerName: "Glacis",
      fees: [{ name: "Bridge Fee", amount: BigNumber("1"), tokenId: "eth", additional: true }],
    })
    const across = makeQuote({ outputAmountBN: 790n, providerName: "Across" })
    const rates = mockRates({ eth: { usd: { price: 2300 } } })

    const sorted = sortQuotes(
      attachFees([across, glacis], rates, { id: "to-token", decimals: 3 }),
      "bestRate"
    )

    expect(sorted.map((s) => s.quote.providerName)).toEqual(["Glacis", "Across"])
  })

  it("falls back to the output amount when a fee paid on top has no rate", () => {
    const unpricedFee = makeQuote({
      outputAmountBN: 790n,
      providerName: "Unpriced fee",
      fees: [{ name: "Gas", amount: BigNumber("1"), tokenId: "unpriced", gas: true }],
    })
    const pricedFee = makeQuote({
      outputAmountBN: 800n,
      providerName: "Priced fee",
      fees: [{ name: "Gas", amount: BigNumber("0.0005"), tokenId: "eth", gas: true }],
    })
    const rates = mockRates({ eth: { usd: { price: 2300 } }, "to-token": { usd: { price: 2.9 } } })

    const sorted = sortQuotes(
      attachFees([unpricedFee, pricedFee], rates, { id: "to-token", decimals: 3 }),
      "bestRate"
    )

    expect(sorted.map((s) => s.quote.providerName)).toEqual(["Priced fee", "Unpriced fee"])
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
})

// ---------------------------------------------------------------------------
// sortQuotes – edge cases
// ---------------------------------------------------------------------------

describe("sortQuotes – edge cases", () => {
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

    const withFees = attachFees(flat, r, null)
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
    const withFees = attachFees(flat, r, null)
    const sorted = sortQuotes(withFees, "cheapest")

    expect(sorted[0]!.quote.providerName).toBe("SimpleSwap")
    expect(sorted[0]!.fees).toBe(3)
    expect(sorted[1]!.fees).toBe(30)
  })
})

describe("attachShortfalls", () => {
  const additionalFee = (amount: string, tokenId = "from-token") => ({
    amount: BigNumber(amount),
    name: "Bridge Fee",
    tokenId,
    additional: true,
  })
  const holding = (transferable: bigint, tokenId = "from-token") => ({
    tokenId,
    decimals: 0,
    transferable,
  })
  const shortfallOf = (quote: QuoteWithFees, transferable: bigint, tokenId?: string) =>
    attachShortfalls([quote], holding(transferable, tokenId))[0]?.shortfall

  it("records what the account lacks to pay the input and the fees on top", () => {
    const quote = wrap(makeQuote({ inputAmountBN: 10n, fees: [additionalFee("195")] }))
    expect(shortfallOf(quote, 40n)).toEqual({ tokenId: "from-token", planck: 165n })
  })

  it("records nothing when the account holds enough", () => {
    const quote = wrap(makeQuote({ inputAmountBN: 10n, fees: [additionalFee("5")] }))
    expect(shortfallOf(quote, 15n)).toBeNull()
  })

  it("counts only the fees on top when the input is another token", () => {
    const quote = wrap(makeQuote({ inputAmountBN: 1000n, fees: [additionalFee("5", "native")] }))
    expect(shortfallOf(quote, 5n, "native")).toBeNull()
  })

  it("ignores fees taken from the swapped amount and fees in other tokens", () => {
    const quote = wrap(
      makeQuote({
        inputAmountBN: 10n,
        fees: [
          { amount: BigNumber("500"), name: "LIFI Fixed Fee", tokenId: "from-token" },
          additionalFee("500", "10:evm-native"),
        ],
      })
    )
    expect(shortfallOf(quote, 10n)).toBeNull()
  })

  it("records nothing while the balance is unknown", () => {
    const quotes = [wrap(makeQuote({ inputAmountBN: 10n, fees: [additionalFee("195")] }))]
    expect(attachShortfalls(quotes, null)).toEqual(quotes)
  })

  it("sorts the routes the account cannot pay for after the ones it can", () => {
    const glacis = {
      ...wrap(makeQuote({ providerName: "Glacis", outputAmountBN: 3000n })),
      shortfall: { tokenId: "from-token", planck: 1n },
    }
    const across = wrap(makeQuote({ providerName: "Across", outputAmountBN: 2000n }))
    expect(sortQuotes([glacis, across], "bestRate").map(({ quote }) => quote.providerName)).toEqual(
      ["Across", "Glacis"]
    )
  })
})

describe("isSelectionAvailable", () => {
  const short = (quote: BaseQuote): QuoteWithFees => ({
    ...wrap(quote),
    shortfall: { tokenId: "from-token", planck: 1n },
  })
  const across = makeQuote({ protocol: "lifi", subProtocol: "across" })
  const glacis = makeQuote({ protocol: "lifi", subProtocol: "glacis" })

  it("keeps a route the account can pay for", () => {
    expect(isSelectionAvailable([wrap(across), short(glacis)], "lifi", "across")).toBe(true)
  })

  it("drops a route the account can no longer pay for when another one fits", () => {
    expect(isSelectionAvailable([wrap(across), short(glacis)], "lifi", "glacis")).toBe(false)
  })

  it("keeps a route the account cannot pay for when none fits, so the confirm screen names the shortfall", () => {
    expect(isSelectionAvailable([short(across), short(glacis)], "lifi", "glacis")).toBe(true)
  })

  it("drops a route that is no longer quoted", () => {
    expect(isSelectionAvailable([wrap(across)], "lifi", "glacis")).toBe(false)
  })
})
