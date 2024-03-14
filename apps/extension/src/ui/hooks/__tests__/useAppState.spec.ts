import { DEFAULT_APP_STATE } from "@extension/core"
import { renderHook, waitFor } from "@testing-library/react"

import { TestWrapper } from "../../../../tests/TestWrapper"
import { useAppState } from "../useAppState"

test("Can get analyticsRequestShown appState data", async () => {
  const { result } = renderHook(() => useAppState("analyticsRequestShown"), {
    wrapper: TestWrapper,
  })
  await waitFor(() => expect(result.current[0]).toBe(DEFAULT_APP_STATE.analyticsRequestShown))
})

test("Can get hasBraveWarningBeenShown appState data", async () => {
  const { result } = renderHook(() => useAppState("hasBraveWarningBeenShown"), {
    wrapper: TestWrapper,
  })
  await waitFor(() => expect(result.current[0]).toBe(DEFAULT_APP_STATE.hasBraveWarningBeenShown))
})

test("Can get hasSpiritKey appState data", async () => {
  const { result } = renderHook(() => useAppState("hasSpiritKey"), {
    wrapper: TestWrapper,
  })
  await waitFor(() => expect(result.current[0]).toBe(DEFAULT_APP_STATE.hasSpiritKey))
})

test("Can get hideBackupWarningUntil appState data", async () => {
  const { result } = renderHook(() => useAppState("hideBackupWarningUntil"), {
    wrapper: TestWrapper,
  })
  await waitFor(() => expect(result.current[0]).toBe(DEFAULT_APP_STATE.hideBackupWarningUntil))
})

test("Can get hideBraveWarning appState data", async () => {
  const { result } = renderHook(() => useAppState("hideBraveWarning"), {
    wrapper: TestWrapper,
  })
  await waitFor(() => expect(result.current[0]).toBe(DEFAULT_APP_STATE.hideBraveWarning))
})

test("Can get needsSpiritKeyUpdate appState data", async () => {
  const { result } = renderHook(() => useAppState("needsSpiritKeyUpdate"), {
    wrapper: TestWrapper,
  })
  await waitFor(() => expect(result.current[0]).toBe(DEFAULT_APP_STATE.needsSpiritKeyUpdate))
})

test("Can get onboarded appState data", async () => {
  const { result } = renderHook(() => useAppState("onboarded"), {
    wrapper: TestWrapper,
  })
  await waitFor(() => expect(result.current[0]).toBe(DEFAULT_APP_STATE.onboarded))
})

test("Can get showStakingBanner appState data", async () => {
  const { result } = renderHook(() => useAppState("hideStakingBanner"), {
    wrapper: TestWrapper,
  })
  await waitFor(() => expect(result.current[0]).toBe(DEFAULT_APP_STATE.hideStakingBanner))
})
