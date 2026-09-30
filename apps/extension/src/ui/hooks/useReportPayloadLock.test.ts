import { act, renderHook } from "@testing-library/react"
import { useLayoutEffect } from "react"
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

  it("passes on a report made before its own mount effect ran, as a child signing step does", () => {
    const onPayloadLockChange = vi.fn()
    renderHook(() => {
      const reportPayloadLock = useReportPayloadLock(onPayloadLockChange)
      useLayoutEffect(() => reportPayloadLock(true), [reportPayloadLock])
    })

    expect(onPayloadLockChange).toHaveBeenCalledWith(true)
  })
})
