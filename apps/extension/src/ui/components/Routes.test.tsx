import { act, cleanup, render, waitFor } from "@testing-library/react"
import { SETTLE_MS } from "@ui/hooks/analytics/screens"
import { lazy, Suspense } from "react"
import { MemoryRouter, Navigate, Route, useNavigate } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Routes } from "./Routes"

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))

const screens = () =>
  track.mock.calls
    .filter(([event]) => event === "$screen")
    .map(([, props]) => props.$screen_name as string)

let navigate: ReturnType<typeof useNavigate> = () => {}
const Navigator = () => {
  navigate = useNavigate()
  return null
}

const Tokens = () => (
  <Routes>
    <Route path="tokens" element={<div>tokens</div>} />
    <Route path="tokens/:symbol" element={<div>token</div>} />
    <Route path="*" element={<Navigate to="tokens" replace />} />
  </Routes>
)

const Home = () => (
  <Routes>
    <Route path="send" element={<div>send</div>} />
    <Route path="*" element={<div>home</div>} />
  </Routes>
)

const App = ({ path }: { path: string }) => (
  <MemoryRouter initialEntries={[path]}>
    <Navigator />
    <Routes>
      <Route path="portfolio/*" element={<Tokens />} />
      <Route path="home/*" element={<Home />} />
      <Route path="accounts">
        <Route path="add">
          <Route index element={<div>add</div>} />
        </Route>
      </Route>
      <Route path="settings">
        <Route path="" element={<div>settings</div>} />
        <Route path="general" element={<div>general</div>} />
      </Route>
      <Route path="*" element={<Navigate to="/portfolio" replace />} />
    </Routes>
    <Routes screen={false}>
      <Route path="portfolio/*" element={<div>toolbar</div>} />
    </Routes>
  </MemoryRouter>
)

describe("<Routes> screen names", () => {
  beforeEach(() => track.mockClear())
  afterEach(cleanup)

  it("joins nested <Routes> into one pattern and never sends the value", async () => {
    render(
      <App path="/portfolio/tokens/DOT?account=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" />
    )

    await waitFor(() => expect(screens()).toEqual(["/portfolio/tokens/:symbol"]))
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/DOT|5Grw/)
  })

  it("names an index route after its parents", async () => {
    render(<App path="/accounts/add" />)

    await waitFor(() => expect(screens()).toEqual(["/accounts/add"]))
  })

  it("names a catch-all screen soon, without the wait of a splat parent", async () => {
    render(<App path="/home/anything" />)

    await waitFor(() => expect(screens()).toEqual(["/home"]), { timeout: 1_000 })
  })

  it("reports where a catch-all redirect lands, not the splat it passed through", async () => {
    render(<App path="/nowhere" />)

    await waitFor(() => expect(screens()).toEqual(["/portfolio/tokens"]))
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(screens()).toEqual(["/portfolio/tokens"])
  })

  it("sends nothing when only the query changes, and the dwell of the previous screen when the pattern changes", async () => {
    render(<App path="/settings/general" />)
    await waitFor(() => expect(screens()).toEqual(["/settings/general"]))

    act(() => navigate("/settings/general?tab=other"))
    act(() => navigate("/portfolio/tokens"))

    await waitFor(() => expect(screens()).toEqual(["/settings/general", "/portfolio/tokens"]))
    expect(track).toHaveBeenLastCalledWith("$screen", {
      $screen_name: "/portfolio/tokens",
      previous_screen_name: "/settings/general",
      previous_dwell_ms: expect.any(Number),
    })
  })

  it("waits for a lazy descendant <Routes> instead of naming its parent", async () => {
    const LazyTokens = lazy(
      () =>
        new Promise<{ default: typeof Tokens }>((resolve) =>
          setTimeout(() => resolve({ default: Tokens }), 150)
        )
    )
    render(
      <MemoryRouter initialEntries={["/earn/tokens/KSM"]}>
        <Routes>
          <Route
            path="earn/*"
            element={
              <Suspense fallback={null}>
                <LazyTokens />
              </Suspense>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(screens()).toEqual(["/earn/tokens/:symbol"]))
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(screens()).toEqual(["/earn/tokens/:symbol"])
  })

  it("names a catch-all screen once it has settled, and a splat left early when it was on show", async () => {
    render(<App path="/home" />)
    await new Promise((resolve) => setTimeout(resolve, 150))
    act(() => navigate("/home/send"))

    await waitFor(() => expect(screens()).toEqual(["/home", "/home/send"]))
    expect(track).toHaveBeenLastCalledWith("$screen", {
      $screen_name: "/home/send",
      previous_screen_name: "/home",
      previous_dwell_ms: expect.any(Number),
    })
    act(() => navigate("/home"))
    await waitFor(() => expect(screens()).toEqual(["/home", "/home/send", "/home"]), {
      timeout: SETTLE_MS.descendant + 500,
    })
  })

  it("does not name the parent of a nested screen the user leaves", async () => {
    render(<App path="/portfolio/tokens/KSM" />)
    await waitFor(() => expect(screens()).toEqual(["/portfolio/tokens/:symbol"]))
    await new Promise((resolve) => setTimeout(resolve, 150))

    act(() => navigate("/accounts/add"))

    await waitFor(() => expect(screens()).toEqual(["/portfolio/tokens/:symbol", "/accounts/add"]))
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(screens()).toEqual(["/portfolio/tokens/:symbol", "/accounts/add"])
  })
})
