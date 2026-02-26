import {
  calculateBollingerBands,
  calculateRSI,
  calculateSMA,
  getSentimentColor,
} from "../indicators"

// ─── calculateSMA ────────────────────────────────────────────────────────────

describe("calculateSMA", () => {
  test("returns all nulls when data length is less than period", () => {
    expect(calculateSMA([1, 2], 5)).toEqual([null, null])
  })

  test("returns correct SMA for period 3", () => {
    const data = [2, 4, 6, 8, 10]
    const result = calculateSMA(data, 3)
    // First two entries should be null
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
    // (2+4+6)/3 = 4
    expect(result[2]).toBeCloseTo(4)
    // (4+6+8)/3 = 6
    expect(result[3]).toBeCloseTo(6)
    // (6+8+10)/3 = 8
    expect(result[4]).toBeCloseTo(8)
  })

  test("returns correct SMA for period 1 (identity)", () => {
    const data = [10, 20, 30]
    expect(calculateSMA(data, 1)).toEqual([10, 20, 30])
  })

  test("handles single-element input with period 1", () => {
    expect(calculateSMA([42], 1)).toEqual([42])
  })

  test("returns empty array for empty input", () => {
    expect(calculateSMA([], 5)).toEqual([])
  })

  test("matches period equal to data length", () => {
    const data = [1, 2, 3, 4, 5]
    const result = calculateSMA(data, 5)
    expect(result.slice(0, 4)).toEqual([null, null, null, null])
    expect(result[4]).toBeCloseTo(3) // (1+2+3+4+5)/5
  })
})

// ─── calculateBollingerBands ─────────────────────────────────────────────────

describe("calculateBollingerBands", () => {
  test("returns nulls for initial period-1 entries", () => {
    const data = [1, 2, 3, 4, 5]
    const bb = calculateBollingerBands(data, 3, 2)
    expect(bb.upper[0]).toBeNull()
    expect(bb.upper[1]).toBeNull()
    expect(bb.middle[0]).toBeNull()
    expect(bb.middle[1]).toBeNull()
    expect(bb.lower[0]).toBeNull()
    expect(bb.lower[1]).toBeNull()
  })

  test("middle band equals SMA", () => {
    const data = [2, 4, 6, 8, 10]
    const bb = calculateBollingerBands(data, 3, 2)
    const sma = calculateSMA(data, 3)
    for (let i = 0; i < data.length; i++) {
      if (sma[i] === null) {
        expect(bb.middle[i]).toBeNull()
      } else {
        expect(bb.middle[i]).toBeCloseTo(sma[i]!)
      }
    }
  })

  test("upper > middle > lower for non-constant data", () => {
    const data = [10, 12, 11, 14, 13, 15, 12, 16]
    const bb = calculateBollingerBands(data, 3, 2)

    for (let i = 0; i < data.length; i++) {
      if (bb.upper[i] !== null && bb.middle[i] !== null && bb.lower[i] !== null) {
        expect(bb.upper[i]!).toBeGreaterThan(bb.middle[i]!)
        expect(bb.middle[i]!).toBeGreaterThan(bb.lower[i]!)
      }
    }
  })

  test("bands collapse to middle for constant data", () => {
    const data = [5, 5, 5, 5, 5]
    const bb = calculateBollingerBands(data, 3, 2)

    for (let i = 2; i < data.length; i++) {
      expect(bb.upper[i]).toBeCloseTo(5)
      expect(bb.middle[i]).toBeCloseTo(5)
      expect(bb.lower[i]).toBeCloseTo(5)
    }
  })

  test("bands are symmetric around middle", () => {
    const data = [10, 12, 11, 14, 13]
    const bb = calculateBollingerBands(data, 3, 2)

    for (let i = 2; i < data.length; i++) {
      const mid = bb.middle[i]!
      const upperDiff = bb.upper[i]! - mid
      const lowerDiff = mid - bb.lower[i]!
      expect(upperDiff).toBeCloseTo(lowerDiff)
    }
  })

  test("returns empty arrays for empty input", () => {
    const bb = calculateBollingerBands([], 3, 2)
    expect(bb.upper).toEqual([])
    expect(bb.middle).toEqual([])
    expect(bb.lower).toEqual([])
  })
})

// ─── calculateRSI ────────────────────────────────────────────────────────────

describe("calculateRSI", () => {
  test("first element is always null", () => {
    const data = [44, 44.34, 44.09, 43.61, 44.33]
    const result = calculateRSI(data, 3)
    expect(result[0]).toBeNull()
  })

  test("returns nulls for indices < period", () => {
    const data = [44, 44.34, 44.09, 43.61, 44.33, 44.83]
    const result = calculateRSI(data, 4)
    // Indices 0..3 should be null, index 4 should have a value
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
    expect(result[2]).toBeNull()
    expect(result[3]).toBeNull()
    expect(result[4]).not.toBeNull()
  })

  test("RSI is 100 when all changes are gains", () => {
    const data = [1, 2, 3, 4, 5, 6, 7]
    const result = calculateRSI(data, 3)
    // After the seed period, RSI should be 100 (no losses)
    for (let i = 3; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(100)
    }
  })

  test("RSI is 0 when all changes are losses", () => {
    const data = [7, 6, 5, 4, 3, 2, 1]
    const result = calculateRSI(data, 3)
    // After the seed period, RSI should be 0 (no gains)
    for (let i = 3; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(0)
    }
  })

  test("RSI stays between 0 and 100 for mixed data", () => {
    const data = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08]
    const result = calculateRSI(data, 5)
    for (const val of result) {
      if (val !== null) {
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(100)
      }
    }
  })

  test("RSI is approximately 50 for symmetric alternating gains and losses", () => {
    // +1, -1, +1, -1, ... — avg gain ≈ avg loss
    const data = [50, 51, 50, 51, 50, 51, 50, 51, 50, 51, 50, 51, 50, 51, 50]
    const result = calculateRSI(data, 5)
    // After initial warmup, RSI should converge near 50
    const lastRsi = result[result.length - 1]
    expect(lastRsi).not.toBeNull()
    expect(lastRsi!).toBeGreaterThan(40)
    expect(lastRsi!).toBeLessThan(60)
  })

  test("output length equals input length", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const result = calculateRSI(data, 3)
    expect(result).toHaveLength(data.length)
  })

  test("handles empty input", () => {
    expect(calculateRSI([], 14)).toEqual([])
  })

  test("handles single element", () => {
    expect(calculateRSI([50], 14)).toEqual([null])
  })
})

// ─── getSentimentColor ───────────────────────────────────────────────────────

describe("getSentimentColor", () => {
  test("returns correct color for each sentiment", () => {
    expect(getSentimentColor("very_bullish")).toBe("#16a34a")
    expect(getSentimentColor("bullish")).toBe("#22c55e")
    expect(getSentimentColor("neutral")).toBe("#a1a1aa")
    expect(getSentimentColor("bearish")).toBe("#f87171")
    expect(getSentimentColor("very_bearish")).toBe("#dc2626")
  })

  test("returns grey for unknown sentiment", () => {
    expect(getSentimentColor("unknown")).toBe("#a1a1aa")
    expect(getSentimentColor("")).toBe("#a1a1aa")
  })
})
