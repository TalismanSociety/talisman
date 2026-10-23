import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getSequentialStepStatus, TransactionsStepper } from "../TransactionsStepper"

describe("getSequentialStepStatus", () => {
  it("marks the steps before the current one done and the ones after it upcoming", () => {
    expect([0, 1, 2].map((index) => getSequentialStepStatus(index, 1, 3, false))).toEqual([
      "done",
      "waiting-on-you",
      "upcoming",
    ])
  })

  it("shows the current step in progress while it is processing", () => {
    expect([0, 1].map((index) => getSequentialStepStatus(index, 1, 2, true))).toEqual([
      "done",
      "in-progress",
    ])
  })

  it("clamps an out of range step index", () => {
    expect([0, 1].map((index) => getSequentialStepStatus(index, -1, 2, false))).toEqual([
      "waiting-on-you",
      "upcoming",
    ])
    expect([0, 1].map((index) => getSequentialStepStatus(index, 5, 2, false))).toEqual([
      "done",
      "waiting-on-you",
    ])
  })
})

describe("TransactionsStepper", () => {
  it("links a step to its href", () => {
    render(
      <TransactionsStepper
        steps={[
          { key: "a", label: "Move", status: "done", href: "https://example.com/tx" },
          { key: "b", label: "Bridge", status: "failed" },
        ]}
      />
    )

    expect(screen.getByRole("link", { name: "Move" }).getAttribute("href")).toBe(
      "https://example.com/tx"
    )
    expect(screen.getByText("Bridge").className).toContain("text-alert-error")
  })

  it("strikes a skipped step through", () => {
    render(
      <TransactionsStepper
        steps={[
          { key: "a", label: "Move", status: "done" },
          { key: "b", label: "Bridge", status: "skipped" },
        ]}
      />
    )

    expect(screen.getByText("Bridge").className).toContain("line-through")
  })
})
