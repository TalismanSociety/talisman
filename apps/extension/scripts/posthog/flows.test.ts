import { catalogueDefinitions } from "@common/analytics/catalogue"
import { defineFlow } from "@common/analytics/flow/defineFlow"
import { flowList } from "@common/analytics/flow/registry"
import { describe, expect, it } from "vitest"

import { flowAbandonment, flowEventColumns, flowFunnelSteps } from "./flows"

const fixture = defineFlow("fixture", {
  subject: "testing a fixture",
  steps: [{ name: "pick", screen: "/fixture/:id" }, "review"],
  settlement: "transaction",
  omit: ["submitted"],
  rename: { started: "fixture_opened", abandoned: "fixture_left" },
  lastStepAlias: "step",
})

describe("flowFunnelSteps", () => {
  it("follows the flow's event names, screens and settlement", () => {
    expect(flowFunnelSteps(fixture)).toEqual([
      expect.objectContaining({ event: "fixture_opened", custom_name: "started" }),
      expect.objectContaining({
        event: "$screen",
        custom_name: "pick",
        properties: [expect.objectContaining({ key: "$screen_name", value: ["/fixture/:id"] })],
      }),
      expect.objectContaining({
        event: "fixture_step_viewed",
        custom_name: "review",
        properties: [expect.objectContaining({ key: "step", value: ["review"] })],
      }),
      expect.objectContaining({
        event: "fixture_completed",
        properties: [expect.objectContaining({ key: "status", value: ["success"] })],
      }),
    ])
  })

  it("requires only the start and the end, as a branch skips steps", () => {
    const steps = flowFunnelSteps(fixture)
    expect(steps.map((s) => s.optionalInFunnel ?? false)).toEqual([false, true, true, false])
  })

  it("counts a swap complete when the exchange finished, not when its transaction succeeded", () => {
    const swap = flowList().find((flow) => flow.name === "swap")
    if (!swap) throw new Error("no swap flow")
    expect(flowFunnelSteps(swap).at(-1)?.properties).toEqual([
      expect.objectContaining({ key: "swap_status", value: ["finished"] }),
    ])
    expect(flowEventColumns([swap]).select).toContain(
      "event = 'swap_completed', ifNull(toString(properties.swap_status), '') IN ('finished')"
    )
  })

  it("builds a funnel for every registered flow from catalogue events only", () => {
    const events = new Set(catalogueDefinitions().events.map((e) => e.name))
    for (const flow of flowList()) {
      const steps = flowFunnelSteps(flow)
      expect(steps).toHaveLength(2 + flow.steps.length + (flow.eventNames.submitted ? 1 : 0))
      for (const { event } of steps)
        expect(event === "$screen" || events.has(event ?? "")).toBe(true)
    }
  })
})

describe("flowAbandonment", () => {
  it("breaks the abandoned event down by the flow's last-step property", () => {
    const source = flowAbandonment(fixture).source
    expect(source.series).toEqual([expect.objectContaining({ event: "fixture_left" })])
    expect(source.breakdownFilter).toEqual({ breakdowns: [{ property: "step", type: "event" }] })
  })
})

describe("flowEventColumns", () => {
  it("maps renamed events to their flow and lifecycle, and reads an aliased last step", () => {
    const { select, where } = flowEventColumns([fixture])
    expect(select).toContain("event = 'fixture_opened', 'started'")
    expect(select).toContain("event = 'fixture_left', 'abandoned'")
    expect(select).toContain("event = 'fixture_left', properties.step")
    expect(where).toContain("'fixture_opened'")
    expect(where).not.toContain("'fixture_submitted'")
  })
})
