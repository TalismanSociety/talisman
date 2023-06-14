import { DEFAULT_APP_STATE } from "@core/domains/app/store.app"
import { renderHook } from "@testing-library/react"

import { TestRecoilRoot } from "../../../../tests/TestRecoilRoot"
import { useAppState } from "../useAppState"

test("Can get analyticsRequestShown appState data", async () => {
  const { result } = renderHook(() => useAppState("analyticsRequestShown"), {
    wrapper: TestRecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.analyticsRequestShown)
})

test("Can get hasBraveWarningBeenShown appState data", async () => {
  const { result } = renderHook(() => useAppState("hasBraveWarningBeenShown"), {
    wrapper: TestRecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hasBraveWarningBeenShown)
})

test("Can get hasFunds appState data", async () => {
  const { result } = renderHook(() => useAppState("hasFunds"), {
    wrapper: TestRecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hasFunds)
})

test("Can get hasSpiritKey appState data", async () => {
  const { result } = renderHook(() => useAppState("hasSpiritKey"), {
    wrapper: TestRecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hasSpiritKey)
})

test("Can get hideBackupWarningUntil appState data", async () => {
  const { result } = renderHook(() => useAppState("hideBackupWarningUntil"), {
    wrapper: TestRecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hideBackupWarningUntil)
})

test("Can get hideBraveWarning appState data", async () => {
  const { result } = renderHook(() => useAppState("hideBraveWarning"), {
    wrapper: TestRecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hideBraveWarning)
})

test("Can get needsSpiritKeyUpdate appState data", async () => {
  const { result } = renderHook(() => useAppState("needsSpiritKeyUpdate"), {
    wrapper: TestRecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.needsSpiritKeyUpdate)
})

test("Can get onboarded appState data", async () => {
  const { result } = renderHook(() => useAppState("onboarded"), {
    wrapper: TestRecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.onboarded)
})

test("Can get showDotNomPoolStakingBanner appState data", async () => {
  const { result } = renderHook(() => useAppState("showDotNomPoolStakingBanner"), {
    wrapper: TestRecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.showDotNomPoolStakingBanner)
})
