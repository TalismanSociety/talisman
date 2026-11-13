import { FLOWS } from "@common/analytics/flow/registry"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { MemoryRouter, Outlet } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const track = vi.hoisted(() => vi.fn())
const trackFlowEvent = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track, trackFlowEvent }))

const app = vi.hoisted(() => ({ onboarded: "FALSE", update: vi.fn() }))
vi.mock("@ui/state/app", () => ({
  useAppState: () => [app.onboarded, app.update],
  useIsOnboarded: () => false,
}))
vi.mock("@core/domains/app/store.password", () => ({
  passwordStore: { get: () => Promise.resolve(undefined) },
}))
vi.mock("@core/domains/app/store.settings", () => ({ settingsStore: { set: vi.fn() } }))
vi.mock("@ui/api", () => ({ api: { onboardCreatePassword: vi.fn() } }))

vi.mock("../routes/Welcome", () => ({ WelcomePage: () => <div>welcome</div> }))
vi.mock("../routes/Password", () => ({ PasswordPage: () => <div>password</div> }))
vi.mock("../routes/Privacy", () => ({ PrivacyPage: () => <div>privacy</div> }))
vi.mock("../routes/Success", () => ({ SuccessPage: () => <div>success</div> }))
vi.mock("../components/OnboardStageWrapper", () => ({ OnboardStageWrapper: () => <Outlet /> }))

import Provider, { useOnboard } from "../context"
import OnboardingRoutes from "../routes"

const screens = () =>
  track.mock.calls.filter(([event]) => event === "$screen").map(([, props]) => props.$screen_name)
const flowEvents = () => trackFlowEvent.mock.calls.map(([event, props]) => ({ event, ...props }))

const settlePasswordCheck = () => act(() => Promise.resolve())

let onboard: ReturnType<typeof useOnboard>
const Probe = () => {
  onboard = useOnboard()
  return null
}

const Onboarding = ({ path = "/" }: { path?: string }) => (
  <MemoryRouter initialEntries={[path]}>
    <Provider>
      <Probe />
      <OnboardingRoutes />
    </Provider>
  </MemoryRouter>
)

describe("onboarding analytics", () => {
  beforeEach(() => {
    track.mockClear()
    trackFlowEvent.mockClear()
    app.onboarded = "FALSE"
  })
  afterEach(cleanup)

  it.each(["/", "/password", "/privacy"])("names %s as the flow's screen step", async (path) => {
    render(<Onboarding path={path} />)

    const declared = FLOWS.onboarding.steps.map(({ screen }) => screen)
    await waitFor(() => expect(screens()).toEqual([path]))
    expect(declared).toContain(path)
  })

  it("starts on install, ends at the privacy choice under a non-mobile name", async () => {
    render(<Onboarding />)
    await settlePasswordCheck()
    act(() => onboard.setOnboarded())

    expect(flowEvents().map(({ event }) => event)).toEqual([
      "onboarding_started",
      "onboarding_setup_completed",
    ])
    expect(flowEvents()[0]).toMatchObject({ entry: "install" })
    expect(app.update).toHaveBeenCalledWith("TRUE")
  })

  it("starts nothing when the wallet is already onboarded", () => {
    app.onboarded = "TRUE"
    render(<Onboarding />)

    expect(trackFlowEvent).not.toHaveBeenCalled()
  })
})
