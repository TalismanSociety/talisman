import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useLockedValue } from "./useLockedValue"

type Props = { value: string | null; isLocked: boolean }

const renderLockedValue = (initialProps: Props) =>
  renderHook(({ value, isLocked }: Props) => useLockedValue(value, isLocked), { initialProps })

describe("useLockedValue", () => {
  it("follows the value while unlocked", () => {
    const { result, rerender } = renderLockedValue({ value: "a", isLocked: false })

    rerender({ value: "b", isLocked: false })

    expect(result.current).toBe("b")
  })

  it("keeps the value from when the lock was taken, even when the live value drops out", () => {
    const { result, rerender } = renderLockedValue({ value: "a", isLocked: false })

    rerender({ value: "a", isLocked: true })
    rerender({ value: null, isLocked: true })
    rerender({ value: "b", isLocked: true })

    expect(result.current).toBe("a")
  })

  it("follows the live value again once released", () => {
    const { result, rerender } = renderLockedValue({ value: "a", isLocked: false })

    rerender({ value: "a", isLocked: true })
    rerender({ value: null, isLocked: true })
    rerender({ value: null, isLocked: false })

    expect(result.current).toBeNull()
  })
})
