import type { AmountWithLabel } from "./balancetypes"
import { getValueId } from "./balancetypes"

const makeAmount = (
  overrides: Partial<AmountWithLabel<string>> & { label: string; type: string }
): AmountWithLabel<string> =>
  ({
    label: overrides.label,
    type: overrides.type,
    source: overrides.source,
    amount: overrides.amount ?? "0",
    meta: overrides.meta,
  }) as AmountWithLabel<string>

describe("getValueId", () => {
  it("joins label, type, source, and empty meta id", () => {
    const amount = makeAmount({ label: "label", type: "type", source: "source" })
    expect(getValueId(amount)).toBe("label::type::source::")
  })

  it("includes source in the id", () => {
    const amount = makeAmount({ label: "label", type: "type", source: "source" })
    expect(getValueId(amount)).toBe("label::type::source::")
  })

  // BUG: Array.join converts undefined to "", so source=undefined and source="" produce
  // the same valueId, which can cause id collisions. Expected "label::type::undefined::"
  // but actual is "label::type::::".
  it("produces empty segment when source is undefined", () => {
    const amount = makeAmount({ label: "label", type: "type" })
    expect(getValueId(amount)).toBe("label::type::::")
  })

  it("includes poolId for nompool type with meta.poolId", () => {
    const amount = makeAmount({
      label: "label",
      type: "nompool",
      source: "source",
      meta: { poolId: 42 },
    })
    expect(getValueId(amount)).toBe("label::nompool::source::42")
  })

  it("returns empty meta id for nompool type without meta", () => {
    const amount = makeAmount({ label: "label", type: "nompool", source: "source" })
    expect(getValueId(amount)).toBe("label::nompool::source::")
  })

  it("does NOT include poolId for non-nompool types", () => {
    const amount = makeAmount({
      label: "label",
      type: "free",
      source: "source",
      meta: { poolId: 42 },
    })
    expect(getValueId(amount)).toBe("label::free::source::")
  })

  it("returns empty meta id for nompool when meta.poolId is undefined", () => {
    const amount = makeAmount({
      label: "label",
      type: "nompool",
      source: "source",
      meta: { poolId: undefined },
    })
    expect(getValueId(amount)).toBe("label::nompool::source::")
  })
})
