import { describe, expect, it } from "vitest"

import { symbolForAnalytics } from "./schema"

describe("symbolForAnalytics", () => {
  it.each(["γSN0", "γSN25", "γSN128"])("keeps the gamma credit symbol %s", (symbol) => {
    expect(symbolForAnalytics(symbol)).toBe(symbol)
  })

  it("reports a symbol outside the allowed characters as unknown", () => {
    expect(symbolForAnalytics("γ SN25")).toBe("unknown")
  })
})
