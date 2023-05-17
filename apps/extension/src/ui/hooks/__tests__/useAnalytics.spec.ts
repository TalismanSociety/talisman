import { act, renderHook } from "@testing-library/react"

import { useAnalytics } from "../useAnalytics"

test("Can send generic event", async () => {
  const { result } = renderHook(() => useAnalytics())
  expect(result.current.genericEvent).toBeDefined()
  act(() => {
    result.current.genericEvent("Test Event")
  })
})

test("Can send pageOpenEvent event", async () => {
  const { result } = renderHook(() => useAnalytics())
  expect(result.current.pageOpenEvent).toBeDefined()
  act(() => {
    result.current.pageOpenEvent("Test Page")
  })
})

test("Can send popupOpenEvent event", async () => {
  const { result } = renderHook(() => useAnalytics())
  expect(result.current.popupOpenEvent).toBeDefined()
  act(() => {
    result.current.popupOpenEvent("Test Popup")
  })
})
