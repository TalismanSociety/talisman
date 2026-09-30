import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useReportPayloadLock } from "./useReportPayloadLock"

describe("useReportPayloadLock", () => {
  it("releases a held lock on unmount", () => {
    const onPayloadLockChange = vi.fn()
    const { result, unmount } = renderHook(() => useReportPayloadLock(onPayloadLockChange))

    act(() => result.current(true))
    unmount()

    expect(onPayloadLockChange).toHaveBeenLastCalledWith(false)
  })

  it("ignores a late report from an unmounted step, so it cannot unlock a newer step", () => {
    let isLocked = false
    const setIsLocked = (locked: boolean) => {
      isLocked = locked
    }
    const first = renderHook(() => useReportPayloadLock(setIsLocked))
    act(() => first.result.current(true))
    const lateReport = first.result.current
    first.unmount()

    const second = renderHook(() => useReportPayloadLock(setIsLocked))
    act(() => second.result.current(true))
    lateReport(false)

    expect(isLocked).toBe(true)
  })
})
