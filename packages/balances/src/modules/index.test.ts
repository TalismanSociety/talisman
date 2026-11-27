import { TokenTypeSchema } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { BALANCE_MODULES } from "."

describe("BALANCE_MODULES", () => {
  it("registers exactly one module per token type", () => {
    const moduleTypes = BALANCE_MODULES.map((mod) => mod.type)

    expect(new Set(moduleTypes).size).toBe(moduleTypes.length)
    expect([...moduleTypes].sort()).toEqual([...TokenTypeSchema.options].sort())
  })
})
