import { act, cleanup, render, waitFor } from "@testing-library/react"
import { Routes } from "@ui/components/Routes"
import { flows } from "@ui/hooks/analytics/flows"
import { useState } from "react"
import { MemoryRouter, Outlet, Route, useNavigate } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AccountAddFlowProvider, addAccountRoute, useAddAccountStep } from "./flow"

const track = vi.hoisted(() => vi.fn())
const trackFlowEvent = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track, trackFlowEvent }))

const sent = () =>
  trackFlowEvent.mock.calls.map(([event, { flow_id: _, duration_ms: __, ...props }]) => ({
    event: (event as string).replace("add_account_", ""),
    ...props,
  }))

let navigate: ReturnType<typeof useNavigate>
let setConnecting: (connecting: boolean) => void

const Navigator = () => {
  navigate = useNavigate()
  return null
}

const LedgerForm = () => {
  const [connecting, setIsConnecting] = useState(false)
  setConnecting = setIsConnecting
  useAddAccountStep(connecting ? "connect_device" : null)
  return <div>ledger</div>
}

const App = ({ path }: { path: string }) => (
  <MemoryRouter initialEntries={[path]}>
    <Navigator />
    <Routes>
      <Route path="portfolio" element={<div>portfolio</div>} />
      <Route path="accounts">
        <Route
          path="add"
          element={
            <AccountAddFlowProvider>
              <Outlet />
            </AccountAddFlowProvider>
          }
        >
          <Route index element={<div>menu</div>} />
          <Route path="ledger/*" element={<LedgerForm />} />
          <Route path="watched" element={<div>watched</div>} />
        </Route>
      </Route>
    </Routes>
  </MemoryRouter>
)

describe("addAccountRoute", () => {
  it.each([
    ["/accounts/add", { step: null }],
    ["/accounts/add/derived", { method: "new", step: "form" }],
    ["/accounts/add/qr", { method: "polkadot_vault", step: "form" }],
    ["/accounts/add/watched", { method: "watch", step: "form" }],
    ["/accounts/add/mnemonic/multiple", { method: "recovery_phrase", step: "select_accounts" }],
    ["/accounts/add/ledger/account", { method: "ledger", step: "select_accounts" }],
    ["/accounts/add/nope", { step: null }],
  ])("reads %s", (pathname, expected) => {
    expect(addAccountRoute(pathname)).toEqual(expected)
  })
})

describe("add_account flow", () => {
  beforeEach(() => {
    track.mockClear()
    trackFlowEvent.mockClear()
  })
  afterEach(cleanup)

  it("follows the method's steps, stamped with the method, and completes once", async () => {
    render(<App path="/accounts/add" />)
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith(
        "$screen",
        expect.objectContaining({ $screen_name: "/accounts/add" })
      )
    )

    act(() => navigate("/accounts/add/ledger"))
    act(() => setConnecting(true))
    act(() => setConnecting(false))
    act(() => flows.add_account.submitted())
    act(() => flows.add_account.completed())
    act(() => navigate("/portfolio"))

    expect(sent()).toEqual([
      { event: "started" },
      { event: "step_viewed", method: "ledger", step: "form" },
      { event: "step_viewed", method: "ledger", step: "connect_device" },
      { event: "step_viewed", method: "ledger", step: "form" },
      { event: "submitted", method: "ledger", last_step: "form" },
      { event: "completed", method: "ledger" },
    ])
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith(
        "$screen",
        expect.objectContaining({ $screen_name: "/portfolio" })
      )
    )
  })

  it("drops a declared step when its component goes away", () => {
    render(<App path="/accounts/add/ledger" />)
    act(() => setConnecting(true))
    act(() => navigate("/accounts/add/watched"))

    expect(sent().slice(-1)).toEqual([{ event: "step_viewed", method: "watch", step: "form" }])
  })

  it("abandons on the menu when the user leaves without picking a method", async () => {
    render(<App path="/portfolio" />)
    act(() => navigate("/accounts/add"))
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith(
        "$screen",
        expect.objectContaining({ $screen_name: "/accounts/add" })
      )
    )

    act(() => navigate("/portfolio"))

    expect(sent()).toEqual([
      { event: "started" },
      { event: "abandoned", last_step: "menu", abandon_cause: "left" },
    ])
  })
})
