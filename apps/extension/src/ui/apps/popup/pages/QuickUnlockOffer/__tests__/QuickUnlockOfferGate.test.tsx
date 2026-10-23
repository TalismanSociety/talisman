import { bind } from "@react-rxjs/core"
import { act, fireEvent, render, screen } from "@testing-library/react"
import type { FC } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

type AuthStatus = "TRUE" | "FALSE" | "UNKNOWN"

const auth = vi.hoisted(() => {
  let status: AuthStatus = "UNKNOWN"
  const listeners = new Set<(status: AuthStatus) => void>()
  return {
    reset: (initial: AuthStatus) => {
      status = initial
      listeners.clear()
    },
    report: (next: AuthStatus) => {
      status = next
      for (const listener of listeners) listener(next)
    },
    subscribe: (listener: (status: AuthStatus) => void) => {
      listeners.add(listener)
      listener(status)
      return () => listeners.delete(listener)
    },
  }
})

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
vi.mock("@ui/api", () => ({ api: { authStatusSubscribe: auth.subscribe } }))
vi.mock("@ui/hooks/analytics/performance", () => ({ tapLoggedIn: () => {} }))
vi.mock("@ui/util/webauthnPrf", () => ({ isQuickUnlockAvailable: () => mockIsAvailable() }))
vi.mock("@ui/state/quickUnlock", () => ({ useQuickUnlockEnrolment: () => mockUseEnrolment() }))
vi.mock("@ui/state/remoteConfig", () => ({
  useFeatureFlag: (...args: unknown[]) => mockUseFeatureFlag(...args),
}))
vi.mock("@ui/state/app", () => ({
  useAppState: (...args: unknown[]) => mockUseAppState(...args),
}))
vi.mock("../QuickUnlockOffer", () => ({
  QuickUnlockOffer: ({ onAnswer }: { onAnswer: () => void }) => (
    <button type="button" onClick={onAnswer}>
      quick unlock offer
    </button>
  ),
}))
vi.mock("../QuickUnlockOfferBackdrop", () => ({ QuickUnlockOfferBackdrop: () => <p>backdrop</p> }))

import { OFFER_DECISION_TIMEOUT_MS } from "../QuickUnlockOfferGate"

let Popup: FC

// the popup learns whether it opened locked once per page, so each test loads a fresh page
const openPage = async () => {
  vi.resetModules()
  const { isLoggedIn$ } = await import("@ui/state/isLoggedIn")
  const { QuickUnlockOfferGate, useCanOfferQuickUnlock } = await import("../QuickUnlockOfferGate")
  const [useIsLoggedIn] = bind(isLoggedIn$, false)

  Popup = () => {
    const isLoggedIn = useIsLoggedIn()
    const canOfferQuickUnlock = useCanOfferQuickUnlock()
    if (!isLoggedIn) return <p>login</p>
    if (!canOfferQuickUnlock) return <p>portfolio</p>
    return (
      <QuickUnlockOfferGate>
        <p>portfolio</p>
      </QuickUnlockOfferGate>
    )
  }

  const view = render(<Popup />)
  await settle()
  return view
}

const flags: Record<string, unknown> = {}

const settle = () => act(async () => {})

const login = () => act(async () => auth.report("TRUE"))

const openLockedThenLogin = async () => {
  auth.reset("FALSE")
  const view = await openPage()
  await login()
  return view
}

const shows = (screenName: "offer" | "portfolio" | "backdrop" | "nothing") => {
  expect({
    offer: !!screen.queryByText("quick unlock offer"),
    portfolio: !!screen.queryByText("portfolio"),
    backdrop: !!screen.queryByText("backdrop"),
  }).toEqual({
    offer: screenName === "offer",
    portfolio: screenName === "portfolio",
    backdrop: screenName === "backdrop",
  })
}

const expectNoOfferInputsRead = () => {
  expect(mockUseFeatureFlag).not.toHaveBeenCalled()
  expect(mockUseEnrolment).not.toHaveBeenCalled()
  expect(mockUseAppState).not.toHaveBeenCalled()
  expect(mockIsAvailable).not.toHaveBeenCalled()
}

describe("QuickUnlockOfferGate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    popup.embedded = true
    flags.hideQuickUnlockOffer = undefined
    mockIsAvailable.mockResolvedValue(true)
    mockUseEnrolment.mockReturnValue(false)
    mockUseFeatureFlag.mockImplementation((flag: string) => flag === "QUICK_UNLOCK")
    mockUseAppState.mockImplementation((key: string) => [flags[key], vi.fn()])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test("offers quick unlock after a login in the toolbar popup", async () => {
    await openLockedThenLogin()

    shows("offer")
  })

  test("checks the device for quick unlock while the user types their password", async () => {
    auth.reset("FALSE")
    await openPage()
    expect(screen.queryByText("login")).not.toBeNull()
    expect(mockIsAvailable).toHaveBeenCalledTimes(1)

    await login()

    shows("offer")
    expect(mockIsAvailable).toHaveBeenCalledTimes(1)
  })

  test("continues to the portfolio once the user has answered", async () => {
    await openLockedThenLogin()

    fireEvent.click(screen.getByText("quick unlock offer"))

    shows("portfolio")
  })

  test("keeps offering while the user turns it on", async () => {
    const view = await openLockedThenLogin()

    mockUseEnrolment.mockReturnValue(true)
    view.rerender(<Popup />)
    shows("offer")

    fireEvent.click(screen.getByText("quick unlock offer"))
    shows("portfolio")
  })

  test("reads nothing in a popup window opened for a dapp request", async () => {
    popup.embedded = false

    await openLockedThenLogin()

    shows("portfolio")
    expectNoOfferInputsRead()
  })

  test("reads nothing in a popup that opened already unlocked", async () => {
    auth.reset("TRUE")
    await openPage()

    shows("portfolio")
    expectNoOfferInputsRead()
  })

  test("reads nothing when a waking background restores the session", async () => {
    auth.reset("UNKNOWN")
    await openPage()
    shows("nothing")

    await login()

    shows("portfolio")
    expectNoOfferInputsRead()
  })

  test("offers once a waking background finds the wallet locked and the user logs in", async () => {
    auth.reset("UNKNOWN")
    await openPage()
    await act(async () => auth.report("FALSE"))

    await login()

    shows("offer")
  })

  test("skips when quick unlock is already on", async () => {
    mockUseEnrolment.mockReturnValue(true)

    await openLockedThenLogin()

    shows("portfolio")
  })

  test("never interrupts the user once it has skipped", async () => {
    mockUseEnrolment.mockReturnValue(true)
    const view = await openLockedThenLogin()
    shows("portfolio")

    mockUseEnrolment.mockReturnValue(false)
    view.rerender(<Popup />)
    await settle()

    shows("portfolio")
  })

  test("shows the offer backdrop while the availability check runs", async () => {
    mockIsAvailable.mockReturnValue(new Promise(() => {}))

    await openLockedThenLogin()

    shows("backdrop")
  })

  test("skips when the availability check never answers", async () => {
    vi.useFakeTimers()
    mockIsAvailable.mockReturnValue(new Promise(() => {}))
    auth.reset("FALSE")
    await openPage()
    await act(async () => vi.advanceTimersByTime(2 * OFFER_DECISION_TIMEOUT_MS))

    await login()
    shows("backdrop")

    await act(async () => vi.advanceTimersByTime(OFFER_DECISION_TIMEOUT_MS - 1))
    shows("backdrop")

    await act(async () => vi.advanceTimersByTime(1))
    shows("portfolio")
  })

  test("offers when a slow availability check answered while the user typed their password", async () => {
    vi.useFakeTimers()
    mockIsAvailable.mockReturnValue(
      new Promise((resolve) => setTimeout(() => resolve(true), 2 * OFFER_DECISION_TIMEOUT_MS))
    )
    auth.reset("FALSE")
    await openPage()

    await act(async () => vi.advanceTimersByTime(3 * OFFER_DECISION_TIMEOUT_MS))
    await login()

    shows("offer")
  })

  test("waits for the enrolment instead of trusting an unknown one", async () => {
    mockUseEnrolment.mockReturnValue(null)

    const view = await openLockedThenLogin()
    shows("backdrop")

    mockUseEnrolment.mockReturnValue(true)
    view.rerender(<Popup />)
    shows("portfolio")
  })

  test("skips when the enrolment never answers", async () => {
    vi.useFakeTimers()
    mockUseEnrolment.mockReturnValue(null)

    await openLockedThenLogin()
    shows("backdrop")

    await act(async () => vi.advanceTimersByTime(OFFER_DECISION_TIMEOUT_MS))
    shows("portfolio")
  })

  test("skips without waiting for the enrolment when the device has no authenticator", async () => {
    mockIsAvailable.mockResolvedValue(false)
    mockUseEnrolment.mockReturnValue(null)

    await openLockedThenLogin()

    shows("portfolio")
  })

  test("skips when the device has no authenticator for it", async () => {
    mockIsAvailable.mockResolvedValue(false)

    await openLockedThenLogin()

    shows("portfolio")
  })

  test("skips while the feature flag is off", async () => {
    mockUseFeatureFlag.mockReturnValue(false)

    await openLockedThenLogin()

    shows("portfolio")
  })

  test("skips once the user declined it for good", async () => {
    flags.hideQuickUnlockOffer = true

    await openLockedThenLogin()

    shows("portfolio")
  })
})
