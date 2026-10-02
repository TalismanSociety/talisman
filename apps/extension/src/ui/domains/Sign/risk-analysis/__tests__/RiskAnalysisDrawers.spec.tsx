import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { RiskAnalysisDrawers } from "../RiskAnalysisDrawers"
import type { RiskAnalysis } from "../types"

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track, trackFlowEvent: vi.fn() }))
vi.mock("@talismn/icons", () => ({ ArrowRightIcon: () => null, ShieldNotOkIcon: () => null }))
vi.mock("@ui/state/settings", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSetting: () => [true, () => {}],
}))

const malicious = {
  platform: "solana",
  validationResult: "Malicious",
  disableCriticalPane: false,
  shouldPromptAutoRiskScan: false,
  review: { drawer: { isOpen: false, close: () => {} } },
} as unknown as RiskAnalysis

describe("critical risk pane", () => {
  afterEach(cleanup)

  it("reports Proceed anyway, and nothing when the user cancels", () => {
    const onReject = vi.fn()
    render(<RiskAnalysisDrawers riskAnalysis={malicious} onReject={onReject} />)

    fireEvent.click(screen.getByText("Cancel"))
    expect(onReject).toHaveBeenCalled()
    expect(track.mock.calls.filter(([event]) => event === "risk_warning_bypassed")).toEqual([])

    fireEvent.click(screen.getByText("Proceed anyway"))
    expect(track.mock.calls.filter(([event]) => event === "risk_warning_bypassed")).toEqual([
      ["risk_warning_bypassed", { platform: "solana" }],
    ])
  })
})
