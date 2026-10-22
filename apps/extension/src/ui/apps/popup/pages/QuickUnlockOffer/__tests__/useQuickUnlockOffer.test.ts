import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const popup = vi.hoisted(() => ({ embedded: true }))
const mockIsAvailable = vi.fn()
const mockUseEnrolment = vi.fn()
const mockUseFeatureFlag = vi.fn()
const mockUseAppState = vi.fn()

vi.mock("@ui/util/constants", () => ({
  get IS_EMBEDDED_POPUP() {
    return popup.embedded
  },
}))
vi.mock("@ui/util/webauthnPrf", () => ({ isQuickUnlockAvailable: () => mockIsAvailable() }))
vi.mock("@ui/state/quickUnlock", () => ({ useQuickUnlockEnrolment: () => mockUseEnrolment() }))
vi.mock("@ui/state/remoteConfig", () => ({
  useFeatureFlag: (...args: unknown[]) => mockUseFeatureFlag(...args),
}))
vi.mock("@ui/state/app", () => ({
  useAppState: (...args: unknown[]) => mockUseAppState(...args),
}))

import { useQuickUnlockOffer } from "../useQuickUnlockOffer"

const flags: Record<string, unknown> = {}

const settle = () => act(async () => {})

const openLockedThenLogin = async () => {
  const hook = renderHook(({ isLoggedIn }) => useQuickUnlockOffer(isLoggedIn), {
    initialProps: { isLoggedIn: false },
  })
  hook.rerender({ isLoggedIn: true })
  await settle()
  return hook
}

describe("useQuickUnlockOffer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    popup.embedded = true
    flags.hideQuickUnlockOffer = undefined
    mockIsAvailable.mockResolvedValue(true)
    mockUseEnrolment.mockReturnValue(false)
    mockUseFeatureFlag.mockImplementation((flag: string) => flag === "QUICK_UNLOCK")
    mockUseAppState.mockImplementation((key: string) => [flags[key], vi.fn()])
  })

  test("offers quick unlock after a login in the toolbar popup", async () => {
    const { result } = await openLockedThenLogin()

    expect(result.current.decision).toBe("offer")
  })

  test("skips while the user hasn't logged in", async () => {
    const { result } = renderHook(() => useQuickUnlockOffer(false))
    await settle()

    expect(mockIsAvailable).toHaveBeenCalled()
    expect(result.current.decision).toBe("skip")
  })

  test("skips once the user has answered in this popup", async () => {
    const { result } = await openLockedThenLogin()

    act(() => result.current.answer())

    expect(result.current.decision).toBe("skip")
  })

  test("keeps offering while the user turns it on", async () => {
    const hook = await openLockedThenLogin()

    mockUseEnrolment.mockReturnValue(true)
    hook.rerender({ isLoggedIn: true })
    expect(hook.result.current.decision).toBe("offer")

    act(() => hook.result.current.answer())
    expect(hook.result.current.decision).toBe("skip")
  })

  test("skips in a popup window opened for a dapp request", async () => {
    popup.embedded = false

    const { result } = await openLockedThenLogin()

    expect(result.current.decision).toBe("skip")
    expect(mockIsAvailable).not.toHaveBeenCalled()
  })

  test("skips in a popup that opened already unlocked", async () => {
    const { result } = renderHook(() => useQuickUnlockOffer(true))

    await settle()

    expect(result.current.decision).toBe("skip")
    expect(mockIsAvailable).not.toHaveBeenCalled()
  })

  test("skips when quick unlock is already on", async () => {
    mockUseEnrolment.mockReturnValue(true)

    const { result } = await openLockedThenLogin()

    expect(result.current.decision).toBe("skip")
  })

  test("waits for the availability check before deciding", async () => {
    mockIsAvailable.mockReturnValue(new Promise(() => {}))

    const { result } = await openLockedThenLogin()

    expect(result.current.decision).toBe("pending")
  })

  test("waits for the enrolment instead of trusting an unknown one", async () => {
    mockUseEnrolment.mockReturnValue(null)

    const hook = await openLockedThenLogin()
    expect(hook.result.current.decision).toBe("pending")

    mockUseEnrolment.mockReturnValue(true)
    hook.rerender({ isLoggedIn: true })
    expect(hook.result.current.decision).toBe("skip")
  })

  test("skips when the device has no authenticator for it", async () => {
    mockIsAvailable.mockResolvedValue(false)

    const { result } = await openLockedThenLogin()

    expect(result.current.decision).toBe("skip")
  })

  test("skips while the feature flag is off", async () => {
    mockUseFeatureFlag.mockReturnValue(false)

    const { result } = await openLockedThenLogin()

    expect(result.current.decision).toBe("skip")
  })

  test("skips once the user declined it for good", async () => {
    flags.hideQuickUnlockOffer = true

    const { result } = await openLockedThenLogin()

    expect(result.current.decision).toBe("skip")
  })
})
