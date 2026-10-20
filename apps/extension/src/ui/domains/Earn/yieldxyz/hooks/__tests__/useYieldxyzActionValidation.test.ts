import type { ActionArgumentsDto, ArgumentSchemaDto } from "@core/domains/earn/exports"
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useYieldxyzActionValidation } from "../useYieldxyzActionValidation"

const schema = {
  fields: [{ name: "amount", required: true, minimum: "1", maximum: "100" }],
} as unknown as ArgumentSchemaDto

const validate = (amount: string) =>
  renderHook(() =>
    useYieldxyzActionValidation({ schema, inputs: { amount } as ActionArgumentsDto })
  ).result.current

describe("useYieldxyzActionValidation", () => {
  it("passes an amount within the product's bounds", () => {
    expect(validate("5")).toEqual({ args: { amount: "5" }, error: null })
  })

  it("reports an amount under the product's minimum as below_minimum", () => {
    expect(validate("0.5")).toEqual({
      args: null,
      error: { message: "Minimum amount is 1", category: "below_minimum" },
    })
  })

  it("reports an amount over the product's maximum as input_invalid", () => {
    expect(validate("101")).toEqual({
      args: null,
      error: { message: "Maximum amount is 100", category: "input_invalid" },
    })
  })

  it("reports a missing required field as input_invalid", () => {
    expect(validate("")).toEqual({
      args: null,
      error: { message: "amount is required", category: "input_invalid" },
    })
  })
})
