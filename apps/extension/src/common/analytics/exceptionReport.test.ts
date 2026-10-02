import { describe, expect, it } from "vitest"

import { buildExceptionReport, EXCEPTION_LIMITS } from "./exceptionReport"

describe("buildExceptionReport", () => {
  it("walks the cause chain into chained entries, the root carrying the mechanism", () => {
    const { exceptions, mechanism, id } = buildExceptionReport(
      new Error("outer", { cause: new TypeError("inner") }),
      { mechanism: "error_boundary", networkId: "polkadot" }
    )

    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(mechanism).toBe("error_boundary")
    expect(exceptions.map(({ type, value }) => `${type}: ${value}`)).toEqual([
      "Error: outer",
      "TypeError: inner",
    ])
    expect(exceptions[0].mechanism).toMatchObject({ type: "error_boundary", handled: true })
    expect(exceptions[1].mechanism).toMatchObject({
      type: "chained",
      source: "cause",
      parent_id: 0,
    })
    expect(exceptions[0].stacktrace?.frames?.length).toBeGreaterThan(0)
  })

  it("reports a thrown string as a synthetic entry, unhandled when uncaught", () => {
    const [entry] = buildExceptionReport("plain string", { mechanism: "uncaught" }).exceptions
    expect(entry).toMatchObject({ value: "plain string", mechanism: { handled: false } })
  })

  it("cuts the message and the frames to the shared limits", () => {
    const deep = (depth: number): never =>
      depth
        ? deep(depth - 1)
        : (() => {
            throw new Error("x".repeat(5_000))
          })()
    let thrown: unknown
    try {
      deep(80)
    } catch (error) {
      thrown = error
    }
    const [entry] = buildExceptionReport(thrown, {}).exceptions
    expect(entry.value).toHaveLength(EXCEPTION_LIMITS.rawValueLength)
    expect(entry.stacktrace?.frames?.length).toBeLessThanOrEqual(EXCEPTION_LIMITS.framesPerEntry)
  })
})
