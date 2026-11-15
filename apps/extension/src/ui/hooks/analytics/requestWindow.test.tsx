import type { ValidRequests } from "@core/libs/requests/types"
import { render, renderHook, waitFor } from "@testing-library/react"
import { api } from "@ui/api"
import { pageContext } from "@ui/api/pageContext"
import { TalismanErrorBoundary } from "@ui/components/TalismanErrorBoundary"
import { describe, expect, it, vi } from "vitest"

import { reportErrorShown, useErrorShown } from "./errorShown"
import {
  reportRequestRisk,
  reportRequestTokenRisk,
  useReportRequestRendered,
} from "./requestWindow"

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))
vi.mock("@ui/api/errorReporting", () => ({ reportError: async () => null }))
vi.mock("@talismn/icons", () => ({ TalismanDeadHandIcon: () => null }))

const request = {
  type: "eth-sign",
  id: "eth-sign.1",
  method: "personal_sign",
  url: "https://app.example.com/",
} as unknown as ValidRequests

describe("request window", () => {
  it("reports a scan verdict only once its request is known", () => {
    reportRequestRisk("Malicious")
    expect(api.analyticsRequestRisk).not.toHaveBeenCalled()
  })

  it("reports the request rendered once per window, then routes scan verdicts to it", async () => {
    const { rerender } = renderHook(({ shown }) => useReportRequestRendered(shown), {
      initialProps: { shown: undefined as ValidRequests | undefined },
    })
    rerender({ shown: request })
    rerender({ shown: { ...request } })

    await waitFor(() => expect(track).toHaveBeenCalledTimes(1))
    expect(track).toHaveBeenCalledWith("dapp_request_rendered", {
      method: "personal_sign",
      platform: "ethereum",
      request_type: "message",
      dapp_domain: "app.example.com",
      render_ms: expect.any(Number),
      after_unlock: false,
    })
    expect(pageContext.requestId).toBe("eth-sign.1")

    reportRequestRisk("Warning")
    expect(api.analyticsRequestRisk).toHaveBeenCalledWith({ id: "eth-sign.1", verdict: "warning" })
  })

  it("reports a spam token as a warning and an unscanned token as nothing", () => {
    vi.mocked(api.analyticsRequestRisk).mockClear()
    reportRequestTokenRisk("unknown")
    expect(api.analyticsRequestRisk).not.toHaveBeenCalled()

    reportRequestTokenRisk("Spam")
    expect(api.analyticsRequestRisk).toHaveBeenCalledWith({ id: "eth-sign.1", verdict: "warning" })
  })
})

const signRequest = (id: string, url: string) =>
  ({
    type: "substrate-sign",
    id,
    url,
    request: { payload: { genesisHash: "0x91" } },
  }) as unknown as ValidRequests

const connectRequest = {
  type: "auth",
  id: "auth.1",
  url: "https://app.example.com/",
  request: { provider: "polkadot" },
} as unknown as ValidRequests

const errorShownProps = () => {
  track.mockClear()
  reportErrorShown({ surface: "alert", category: "ledger" })
  return track.mock.calls.find(([event]) => event === "error_shown")?.[1]
}

describe("errors shown on a dapp request", () => {
  it("name the dapp of the signing request on screen", () => {
    const { unmount } = renderHook(() =>
      useReportRequestRendered(signRequest("substrate-sign.1", "https://Polkadot.JS.org/apps"))
    )

    expect(errorShownProps()).toMatchObject({ dapp_domain: "polkadot.js.org" })

    unmount()
    expect(errorShownProps()).not.toHaveProperty("dapp_domain")
  })

  it("name no dapp on a connection request", () => {
    const { unmount } = renderHook(() => useReportRequestRendered(connectRequest))

    expect(errorShownProps()).not.toHaveProperty("dapp_domain")
    unmount()
  })

  it("carry a null domain for a dapp on localhost", () => {
    const { unmount } = renderHook(() =>
      useReportRequestRendered(signRequest("substrate-sign.2", "http://localhost:3000/"))
    )

    expect(errorShownProps()).toMatchObject({ dapp_domain: null })
    unmount()
  })

  it("follow the window to the next request, from another dapp", () => {
    const { rerender, unmount } = renderHook(({ shown }) => useReportRequestRendered(shown), {
      initialProps: { shown: signRequest("substrate-sign.3", "https://first.example.com/") },
    })
    rerender({ shown: signRequest("substrate-sign.4", "https://second.example.org/") })

    expect(errorShownProps()).toMatchObject({ dapp_domain: "second.example.org" })
    unmount()
  })

  it("keep the dapp while another holder of the same request stays mounted", () => {
    const shown = signRequest("substrate-sign.5", "https://app.example.com/")
    const page = renderHook(() => useReportRequestRendered(shown))
    const context = renderHook(() => useReportRequestRendered(shown))

    context.unmount()
    expect(errorShownProps()).toMatchObject({ dapp_domain: "app.example.com" })
    page.unmount()
  })

  it("name the dapp for an alert that a child reports as it mounts", () => {
    track.mockClear()
    const Alert = () => {
      useErrorShown({ shown: "metadata missing", surface: "alert", category: "unsupported" })
      return null
    }
    const Page = () => {
      useReportRequestRendered(signRequest("substrate-sign.6", "https://app.example.com/"))
      return <Alert />
    }

    const { unmount } = render(<Page />)

    expect(track).toHaveBeenCalledWith(
      "error_shown",
      expect.objectContaining({ error_category: "unsupported", dapp_domain: "app.example.com" })
    )
    unmount()
  })

  it("name the dapp on the crash screen of its signing request", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const Screen = ({ crash }: { crash: boolean }) => {
      if (crash) throw new Error("signing view crashed")
      return null
    }
    const Page = ({ crash }: { crash: boolean }) => {
      useReportRequestRendered(signRequest("substrate-sign.7", "https://app.example.com/"))
      return <Screen crash={crash} />
    }
    const ui = render(
      <TalismanErrorBoundary>
        <Page crash={false} />
      </TalismanErrorBoundary>
    )
    track.mockClear()

    ui.rerender(
      <TalismanErrorBoundary>
        <Page crash={true} />
      </TalismanErrorBoundary>
    )

    expect(track).toHaveBeenCalledWith(
      "error_shown",
      expect.objectContaining({ surface: "boundary", dapp_domain: "app.example.com" })
    )
    expect(pageContext.signingDapps).toEqual([])
    ui.unmount()
  })
})
