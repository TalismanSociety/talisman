import { act, fireEvent, render, screen } from "@testing-library/react"
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
vi.mock("../QuickUnlockOffer", () => ({
  QuickUnlockOffer: ({ onAnswer }: { onAnswer: () => void }) => (
    <button type="button" onClick={onAnswer}>
      quick unlock offer
    </button>
  ),
}))

import { QuickUnlockOfferGate, useCanOfferQuickUnlock } from "../QuickUnlockOfferGate"

const Popup = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  const canOfferQuickUnlock = useCanOfferQuickUnlock(isLoggedIn)
  if (!isLoggedIn) return <p>login</p>
  if (!canOfferQuickUnlock) return <p>portfolio</p>
  return (
    <QuickUnlockOfferGate>
      <p>portfolio</p>
    </QuickUnlockOfferGate>
  )
}

const flags: Record<string, unknown> = {}

const settle = () => act(async () => {})

const openLockedThenLogin = async () => {
  const view = render(<Popup isLoggedIn={false} />)
  view.rerender(<Popup isLoggedIn />)
  await settle()
  return view
}

const shows = (screenName: "offer" | "portfolio" | "nothing") => {
  expect({
    offer: !!screen.queryByText("quick unlock offer"),
    portfolio: !!screen.queryByText("portfolio"),
  }).toEqual({ offer: screenName === "offer", portfolio: screenName === "portfolio" })
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

  test("offers quick unlock after a login in the toolbar popup", async () => {
    await openLockedThenLogin()

    shows("offer")
  })

  test("continues to the portfolio once the user has answered", async () => {
    await openLockedThenLogin()

    fireEvent.click(screen.getByText("quick unlock offer"))

    shows("portfolio")
  })

  test("keeps offering while the user turns it on", async () => {
    const view = await openLockedThenLogin()

    mockUseEnrolment.mockReturnValue(true)
    view.rerender(<Popup isLoggedIn />)
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
    render(<Popup isLoggedIn />)
    await settle()

    shows("portfolio")
    expectNoOfferInputsRead()
  })

  test("skips when quick unlock is already on", async () => {
    mockUseEnrolment.mockReturnValue(true)

    await openLockedThenLogin()

    shows("portfolio")
  })

  test("waits for the availability check before deciding", async () => {
    mockIsAvailable.mockReturnValue(new Promise(() => {}))

    await openLockedThenLogin()

    shows("nothing")
  })

  test("waits for the enrolment instead of trusting an unknown one", async () => {
    mockUseEnrolment.mockReturnValue(null)

    const view = await openLockedThenLogin()
    shows("nothing")

    mockUseEnrolment.mockReturnValue(true)
    view.rerender(<Popup isLoggedIn />)
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
