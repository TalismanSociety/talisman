import {
  convertScore1To100Neg,
  convertScore1To100Pos,
  convertScore2To100Neg,
  convertScore2To100Pos,
  formatCompactAlpha,
  formatCompactNumber,
  raoToTao,
} from "../util"

// ─── raoToTao ───────────────────────────────────────────────────────────────

describe("raoToTao", () => {
  it("converts zero rao to 0 TAO", () => {
    expect(raoToTao("0")).toBe(0)
    expect(raoToTao(0n)).toBe(0)
  })

  it("converts exactly 1 TAO (1e9 rao)", () => {
    expect(raoToTao("1000000000")).toBe(1)
    expect(raoToTao(1_000_000_000n)).toBe(1)
  })

  it("converts fractional amounts correctly", () => {
    // 500_000_000 rao = 0.5 TAO
    expect(raoToTao("500000000")).toBeCloseTo(0.5)
    // 1 rao = 1e-9 TAO
    expect(raoToTao("1")).toBeCloseTo(1e-9)
  })

  it("handles large amounts beyond Number.MAX_SAFE_INTEGER rao", () => {
    // 10 billion TAO in rao = 10_000_000_000 * 1e9 = 1e19
    const largeRao = "10000000000000000000"
    expect(raoToTao(largeRao)).toBeCloseTo(10_000_000_000)
  })

  it("handles negative amounts", () => {
    expect(raoToTao("-1000000000")).toBe(-1)
    expect(raoToTao(-1_000_000_000n)).toBe(-1)
    expect(raoToTao("-500000000")).toBeCloseTo(-0.5)
  })

  it("returns 0 for null and undefined", () => {
    expect(raoToTao(null)).toBe(0)
    expect(raoToTao(undefined)).toBe(0)
  })

  it("falls back to Number parsing for non-BigInt strings", () => {
    // "1.5" can't be parsed as BigInt, but Number("1.5") / 1e9 works
    expect(raoToTao("1.5")).toBeCloseTo(1.5 / 1e9)
  })

  it("returns 0 for completely invalid strings", () => {
    expect(raoToTao("not-a-number")).toBe(0)
  })
})

// ─── convertScore2To100Pos ──────────────────────────────────────────────────

describe("convertScore2To100Pos", () => {
  it("maps -2 to 0", () => {
    expect(convertScore2To100Pos(-2)).toBe(0)
  })

  it("maps 0 to 50", () => {
    expect(convertScore2To100Pos(0)).toBe(50)
  })

  it("maps 2 to 100", () => {
    expect(convertScore2To100Pos(2)).toBe(100)
  })

  it("maps -1 to 25", () => {
    expect(convertScore2To100Pos(-1)).toBe(25)
  })

  it("maps 1 to 75", () => {
    expect(convertScore2To100Pos(1)).toBe(75)
  })

  it("returns 50 for null / undefined", () => {
    expect(convertScore2To100Pos(null)).toBe(50)
    expect(convertScore2To100Pos(undefined)).toBe(50)
  })
})

// ─── convertScore2To100Neg ──────────────────────────────────────────────────

describe("convertScore2To100Neg", () => {
  it("maps -2 to -100", () => {
    expect(convertScore2To100Neg(-2)).toBe(-100)
  })

  it("maps 0 to 0", () => {
    expect(convertScore2To100Neg(0)).toBe(0)
  })

  it("maps 2 to 100", () => {
    expect(convertScore2To100Neg(2)).toBe(100)
  })

  it("maps 1 to 50", () => {
    expect(convertScore2To100Neg(1)).toBe(50)
  })

  it("maps -1 to -50", () => {
    expect(convertScore2To100Neg(-1)).toBe(-50)
  })

  it("clamps out-of-bounds values to [-100, 100]", () => {
    expect(convertScore2To100Neg(5)).toBe(100)
    expect(convertScore2To100Neg(-5)).toBe(-100)
  })

  it("returns 0 for null / undefined", () => {
    expect(convertScore2To100Neg(null)).toBe(0)
    expect(convertScore2To100Neg(undefined)).toBe(0)
  })
})

// ─── convertScore1To100Pos ──────────────────────────────────────────────────

describe("convertScore1To100Pos", () => {
  it("maps -1 to 0", () => {
    expect(convertScore1To100Pos(-1)).toBe(0)
  })

  it("maps 0 to 50", () => {
    expect(convertScore1To100Pos(0)).toBe(50)
  })

  it("maps 1 to 100", () => {
    expect(convertScore1To100Pos(1)).toBe(100)
  })

  it("returns 50 for null / undefined", () => {
    expect(convertScore1To100Pos(null)).toBe(50)
    expect(convertScore1To100Pos(undefined)).toBe(50)
  })
})

// ─── convertScore1To100Neg ──────────────────────────────────────────────────

describe("convertScore1To100Neg", () => {
  it("maps -1 to -100", () => {
    expect(convertScore1To100Neg(-1)).toBe(-100)
  })

  it("maps 0 to 0", () => {
    expect(convertScore1To100Neg(0)).toBe(0)
  })

  it("maps 1 to 100", () => {
    expect(convertScore1To100Neg(1)).toBe(100)
  })

  it("maps 0.5 to 50", () => {
    expect(convertScore1To100Neg(0.5)).toBe(50)
  })

  it("clamps out-of-bounds values to [-100, 100]", () => {
    expect(convertScore1To100Neg(3)).toBe(100)
    expect(convertScore1To100Neg(-3)).toBe(-100)
  })

  it("returns 0 for null / undefined", () => {
    expect(convertScore1To100Neg(null)).toBe(0)
    expect(convertScore1To100Neg(undefined)).toBe(0)
  })
})

// ─── formatCompactNumber ────────────────────────────────────────────────────

describe("formatCompactNumber", () => {
  it("returns '0' for zero", () => {
    expect(formatCompactNumber(0)).toBe("0")
  })

  it("formats thousands with K suffix", () => {
    const result = formatCompactNumber(1500)
    expect(result).toMatch(/1\.5K/i)
  })

  it("formats millions with M suffix", () => {
    const result = formatCompactNumber(2_500_000)
    expect(result).toMatch(/2\.5M/i)
  })

  it("formats billions with B suffix", () => {
    const result = formatCompactNumber(1_200_000_000)
    expect(result).toMatch(/1\.2B/i)
  })

  it("respects custom decimal places", () => {
    const result = formatCompactNumber(1_234_567, 2)
    expect(result).toMatch(/1\.23M/i)
  })

  it("does not abbreviate small numbers", () => {
    expect(formatCompactNumber(42)).toBe("42")
    expect(formatCompactNumber(999)).toBe("999")
  })
})

// ─── formatCompactAlpha ─────────────────────────────────────────────────────

describe("formatCompactAlpha", () => {
  it("uses the default 'a' suffix", () => {
    const result = formatCompactAlpha(1500)
    expect(result).toMatch(/2K.*a/i) // 1500 rounds to 2K with 0 decimals
  })

  it("uses a custom symbol suffix", () => {
    const result = formatCompactAlpha(1_000_000, "α")
    expect(result).toMatch(/1M.*α/i)
  })
})
