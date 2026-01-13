import { renderHook, waitFor } from "@testing-library/react"
import { DEFAULT_APP_STATE } from "extension-core"
import { beforeEach } from "vitest"

import { TestWrapper } from "../../../../tests/TestWrapper"
import { useAppState } from "../../state"

// Clear storage before each test to ensure isolation
beforeEach(async () => {
  await chrome.storage.local.clear()
})

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

test("Can get onboarded appState data", async () => {
  const { result } = renderHook(() => useAppState("onboarded"), {
    wrapper: TestWrapper,
  })
  // Note: AppStore.init() changes "UNKNOWN" to "FALSE" immediately after initialization
  // so the expected value is "FALSE", not the DEFAULT_APP_STATE.onboarded which is "UNKNOWN"
  await waitFor(() => expect(result.current[0]).toBe("FALSE"))
})
