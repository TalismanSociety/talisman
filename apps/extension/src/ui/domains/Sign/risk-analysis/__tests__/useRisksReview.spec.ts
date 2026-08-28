import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { RiskAnalysisResponse } from "../types"
import { useRisksReview } from "../useRisksReview"

const malicious = {
  validation: { result_type: "Malicious" },
} as RiskAnalysisResponse<"ethereum">

const renderReview = (subjectKey: string) =>
  renderHook(({ key }: { key: string }) => useRisksReview("ethereum", malicious, key), {
    initialProps: { key: subjectKey },
  })

describe("useRisksReview", () => {
  it("requires acknowledgement of a flagged transaction", () => {
    const { result } = renderReview("approval")

    expect(result.current.isRiskAcknowledgementRequired).toBe(true)
    expect(result.current.isRiskAcknowledged).toBe(false)

    act(() => result.current.setIsRiskAcknowledged(true))

    expect(result.current.isRiskAcknowledged).toBe(true)
  })

  it("does not carry an acknowledgement over to the next transaction", () => {
    const { result, rerender } = renderReview("approval")

    act(() => result.current.setIsRiskAcknowledged(true))
    rerender({ key: "swap" })

    expect(result.current.isRiskAcknowledged).toBe(false)
  })

  it("opens the review drawer again for the next flagged transaction", () => {
    const { result, rerender } = renderReview("approval")

    expect(result.current.drawer.isOpen).toBe(true)

    act(() => result.current.drawer.close())
    rerender({ key: "swap" })

    expect(result.current.drawer.isOpen).toBe(true)
  })

  it("requires a new acknowledgement when an acknowledged subject comes back", () => {
    const { result, rerender } = renderReview("approval")

    act(() => result.current.setIsRiskAcknowledged(true))
    rerender({ key: "swap" })
    rerender({ key: "approval" })

    expect(result.current.isRiskAcknowledged).toBe(false)
  })

  it("opens the review drawer again when an acknowledged subject comes back", () => {
    const { result, rerender } = renderReview("approval")

    act(() => result.current.drawer.close())
    rerender({ key: "swap" })
    act(() => result.current.drawer.close())
    rerender({ key: "approval" })

    expect(result.current.drawer.isOpen).toBe(true)
  })
})
