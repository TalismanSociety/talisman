import { describe, expect, it } from "vitest"

import { isErrorOfName } from "./isErrorOfName"

describe("isErrorOfName", () => {
  it("matches an Error by its name", () => {
    const err = new Error("boom")
    err.name = "ContractFunctionExecutionError"
    expect(isErrorOfName(err, "ContractFunctionExecutionError")).toBe(true)
  })

  it("matches against any of several names", () => {
    const err = new Error("boom")
    err.name = "EstimateGasExecutionError"
    expect(isErrorOfName(err, "ContractFunctionExecutionError", "EstimateGasExecutionError")).toBe(
      true
    )
  })

  it("returns false for a non-matching name", () => {
    expect(isErrorOfName(new TypeError("x"), "ContractFunctionExecutionError")).toBe(false)
  })

  it("returns false for non-Error values", () => {
    expect(
      isErrorOfName({ name: "ContractFunctionExecutionError" }, "ContractFunctionExecutionError")
    ).toBe(false)
    expect(isErrorOfName(undefined, "ContractFunctionExecutionError")).toBe(false)
    expect(isErrorOfName("ContractFunctionExecutionError", "ContractFunctionExecutionError")).toBe(
      false
    )
  })
})
