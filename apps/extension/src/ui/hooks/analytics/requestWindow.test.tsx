import type { ValidRequests } from "@core/libs/requests/types"
import { renderHook, waitFor } from "@testing-library/react"
import { api } from "@ui/api"
import { pageContext } from "@ui/api/pageContext"
import { describe, expect, it, vi } from "vitest"

import {
  reportRequestRisk,
  reportRequestTokenRisk,
  useReportRequestRendered,
} from "./requestWindow"

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))

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
