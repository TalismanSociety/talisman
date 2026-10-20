import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useAmountSetByMax } from "./amountSetByMax"

const renderAmount = () =>
  renderHook(({ amount }) => useAmountSetByMax(amount), {
    initialProps: { amount: null as bigint | null },
  })

describe("useAmountSetByMax", () => {
  it("keeps the Max amount until the amount catches up, then while it stays the same", () => {
    const { result, rerender } = renderAmount()
    act(() => result.current[1](5n))
    expect(result.current[0]).toBe(5n)
    rerender({ amount: 5n })
    rerender({ amount: 5n })
    expect(result.current[0]).toBe(5n)
  })

  it("forgets the Max amount once the amount changes, even when it changes back", () => {
    const { result, rerender } = renderAmount()
    act(() => result.current[1](5n))
    rerender({ amount: 5n })
    rerender({ amount: null })
    rerender({ amount: 5n })
    expect(result.current[0]).toBeNull()
  })
})
