import { DEFAULT_APP_STATE } from "@core/domains/app/store.app"
import { renderHook } from "@testing-library/react"
import { RecoilRoot } from "recoil"

import { useAppState } from "../useAppState"

test("Can get analyticsRequestShown appState data", async () => {
  const { result } = renderHook(() => useAppState("analyticsRequestShown"), {
    wrapper: RecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.analyticsRequestShown)
})

test("Can get hasBraveWarningBeenShown appState data", async () => {
  const { result } = renderHook(() => useAppState("hasBraveWarningBeenShown"), {
    wrapper: RecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hasBraveWarningBeenShown)
})

test("Can get hasFunds appState data", async () => {
  const { result } = renderHook(() => useAppState("hasFunds"), {
    wrapper: RecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hasFunds)
})

test("Can get hasSpiritKey appState data", async () => {
  const { result } = renderHook(() => useAppState("hasSpiritKey"), {
    wrapper: RecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hasSpiritKey)
})

test("Can get hideBackupWarningUntil appState data", async () => {
  const { result } = renderHook(() => useAppState("hideBackupWarningUntil"), {
    wrapper: RecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hideBackupWarningUntil)
})

test("Can get hideBraveWarning appState data", async () => {
  const { result } = renderHook(() => useAppState("hideBraveWarning"), {
    wrapper: RecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hideBraveWarning)
})

test("Can get needsSpiritKeyUpdate appState data", async () => {
  const { result } = renderHook(() => useAppState("needsSpiritKeyUpdate"), {
    wrapper: RecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.needsSpiritKeyUpdate)
})

test("Can get onboarded appState data", async () => {
  const { result } = renderHook(() => useAppState("onboarded"), {
    wrapper: RecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.onboarded)
})

test("Can get showStakingBanner appState data", async () => {
  const { result } = renderHook(() => useAppState("hideStakingBanner"), {
    wrapper: RecoilRoot,
  })
  expect(result.current[0]).toBe(DEFAULT_APP_STATE.hideStakingBanner)
})
