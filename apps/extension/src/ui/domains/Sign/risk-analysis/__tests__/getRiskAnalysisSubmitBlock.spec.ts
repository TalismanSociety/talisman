import type { TFunction } from "i18next"
import { describe, expect, it } from "vitest"

import type { RiskAnalysis } from "../types"
import { getRiskAnalysisSubmitBlock } from "../useRiskAnalysisSubmitGate"

const t = ((key: string) => key) as TFunction

const riskAnalysis = (props: {
  validationResult?: "Benign" | "Warning" | "Malicious"
  isRiskAcknowledgementRequired: boolean
  isRiskAcknowledged: boolean
  isValidating?: boolean
}) =>
  ({
    validationResult: props.validationResult,
    isValidating: !!props.isValidating,
    review: {
      isRiskAcknowledgementRequired: props.isRiskAcknowledgementRequired,
      isRiskAcknowledged: props.isRiskAcknowledged,
    },
  }) as RiskAnalysis

describe("getRiskAnalysisSubmitBlock", () => {
  it("allows submit when there is no risk analysis", () => {
    expect(getRiskAnalysisSubmitBlock(undefined, t).isBlocked).toBe(false)
  })

  it("allows submit when the transaction is not flagged", () => {
    const result = getRiskAnalysisSubmitBlock(
      riskAnalysis({
        validationResult: "Benign",
        isRiskAcknowledgementRequired: false,
        isRiskAcknowledged: false,
      }),
      t
    )

    expect(result.isBlocked).toBe(false)
  })

  it("blocks submit of a malicious transaction", () => {
    const result = getRiskAnalysisSubmitBlock(
      riskAnalysis({
        validationResult: "Malicious",
        isRiskAcknowledgementRequired: true,
        isRiskAcknowledged: false,
      }),
      t
    )

    expect(result.isBlocked).toBe(true)
    expect(result.message).toContain("harmful")
  })

  it("blocks submit of a flagged transaction that isn't malicious", () => {
    const result = getRiskAnalysisSubmitBlock(
      riskAnalysis({
        validationResult: "Warning",
        isRiskAcknowledgementRequired: true,
        isRiskAcknowledged: false,
      }),
      t
    )

    expect(result.isBlocked).toBe(true)
    expect(result.message).not.toContain("harmful")
  })

  it("blocks submit while the scan is still running", () => {
    const result = getRiskAnalysisSubmitBlock(
      riskAnalysis({
        isRiskAcknowledgementRequired: false,
        isRiskAcknowledged: false,
        isValidating: true,
      }),
      t
    )

    expect(result.isBlocked).toBe(true)
  })

  it("allows submit once the user acknowledges the risks", () => {
    const result = getRiskAnalysisSubmitBlock(
      riskAnalysis({
        validationResult: "Malicious",
        isRiskAcknowledgementRequired: true,
        isRiskAcknowledged: true,
      }),
      t
    )

    expect(result.isBlocked).toBe(false)
    expect(result.message).toBeNull()
  })
})
