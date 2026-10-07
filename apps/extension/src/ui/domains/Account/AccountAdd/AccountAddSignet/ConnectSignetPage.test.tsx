import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { AccountAddFlowProvider } from "../flow"
import { ConnectSignetPage } from "./ConnectSignetPage"
import { SignetConnectProvider } from "./context"

const track = vi.hoisted(() => vi.fn())
const trackFlowEvent = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track, trackFlowEvent }))

describe("ConnectSignetPage", () => {
  it("links 'find out more' to the Signet app", () => {
    render(
      <MemoryRouter initialEntries={["/accounts/add/signet"]}>
        <AccountAddFlowProvider>
          <SignetConnectProvider onSuccess={vi.fn()}>
            <ConnectSignetPage />
          </SignetConnectProvider>
        </AccountAddFlowProvider>
      </MemoryRouter>
    )

    const link = screen.getByRole("link", { name: "https://signet.talisman.xyz" })
    expect(link.getAttribute("href")).toBe("https://signet.talisman.xyz")
  })
})
