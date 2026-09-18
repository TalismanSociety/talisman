import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (value: string, options?: Record<string, string>) =>
      value.replace("{{symbol}}", options?.symbol ?? ""),
  }),
}))

import { TokenRiskDetails } from "../TokenRiskDetails"

describe("TokenRiskDetails", () => {
  it("renders fees as fractions and locked liquidity as a percentage", () => {
    render(
      <TokenRiskDetails
        symbol="BAD"
        scan={{
          verdict: "Warning",
          features: [],
          fees: { buy: 0, sell: 0.05, transfer: 1 },
          financialStats: { lockedLiquidityPercentage: 99.586 },
        }}
      />
    )

    expect(screen.queryByText("Buy fee")).toBeNull()
    expect(screen.getByText("Sell fee").nextElementSibling?.textContent).toBe("5%")
    expect(screen.getByText("Transfer fee").nextElementSibling?.textContent).toBe("100%")
    expect(screen.getByText("Locked liquidity").nextElementSibling?.textContent).toBe("99.59%")
  })

  it("orders feature groups by severity", () => {
    render(
      <TokenRiskDetails
        symbol="BAD"
        scan={{
          verdict: "Malicious",
          features: [
            { id: "A", type: "Benign", description: "benign" },
            { id: "B", type: "Info", description: "info" },
            { id: "C", type: "Malicious", description: "malicious" },
            { id: "D", type: "Warning", description: "warning" },
          ],
          fees: {},
          financialStats: {},
        }}
      />
    )

    const descriptions = screen.getAllByRole("listitem").map((item) => item.textContent)
    expect(descriptions).toEqual(["malicious", "warning", "info", "benign"])
  })
})
