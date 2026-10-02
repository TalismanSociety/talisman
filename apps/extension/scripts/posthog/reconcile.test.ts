import { describe, expect, it } from "vitest"

import { ev, trend, withTestAccountFilter } from "./queries"
import { changedFields, isSame, pickByName, withoutSchemaVersion, withTags } from "./reconcile"

describe("idempotent matching", () => {
  it("reads a stored query as unchanged when only PostHog's schema version differs", () => {
    const spec = trend({ series: [ev("a")] })
    const stored = { ...spec, source: { ...spec.source, version: 2 } }
    expect(isSame(withoutSchemaVersion(stored), spec)).toBe(true)
    expect(isSame(withoutSchemaVersion(stored), withTestAccountFilter(spec, false))).toBe(false)
  })

  it("compares objects whatever their key order", () => {
    expect(
      changedFields({ a: { x: 1, y: 2 }, b: "same" }, { a: { y: 2, x: 1 }, b: "same" })
    ).toEqual({})
    expect(changedFields({ a: 1 }, { a: 2, b: 3 })).toEqual({ a: 2, b: 3 })
  })

  it("prefers the object that already carries the spec name", () => {
    const objects = [{ name: "01. Old" }, { name: "02. New" }]
    expect(pickByName(objects, "02. New")).toBe(objects[1])
    expect(pickByName(objects, "03. Other")).toBe(objects[0])
  })

  it("keeps stored tags and adds the missing ones once", () => {
    expect(withTags(["mine", "managed-by-code"])).toEqual(["mine", "managed-by-code"])
    expect(withTags(null, ["managed-by-code", "flow"])).toEqual(["managed-by-code", "flow"])
  })
})
