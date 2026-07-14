import { describe, expect, it } from "vitest"

import { type ItemParseResult, validateArrayWithYield } from "./validateArrayWithYield"

const parseNumber = (item: unknown): ItemParseResult<number, string> =>
  typeof item === "number"
    ? { success: true, data: item * 2 }
    : { success: false, error: `not a number: ${item}` }

describe("validateArrayWithYield", () => {
  it("returns all parsed items on success", async () => {
    expect(await validateArrayWithYield([1, 2, 3], parseNumber)).toEqual({
      success: true,
      data: [2, 4, 6],
    })
  })

  it("collects ALL failures with their indexes (no fail-fast)", async () => {
    expect(await validateArrayWithYield([1, "a", 3, "b"], parseNumber)).toEqual({
      success: false,
      errors: [
        { index: 1, error: "not a number: a" },
        { index: 3, error: "not a number: b" },
      ],
    })
  })

  it("handles empty arrays", async () => {
    expect(await validateArrayWithYield([], parseNumber)).toEqual({ success: true, data: [] })
  })

  it("rejects with an AbortError when aborted", async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      validateArrayWithYield([1, 2, 3], parseNumber, { signal: controller.signal })
    ).rejects.toSatisfy((error) => error instanceof Error && error.name === "AbortError")
  })
})
