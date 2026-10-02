import { describe, expect, it } from "vitest"

import { parseTrackedEvent } from "./parse"

describe("parseTrackedEvent", () => {
  it("accepts a catalogued event and returns its kind", () => {
    expect(
      parseTrackedEvent({ event: "analytics_opt_in", properties: { source: "onboarding" } })
    ).toEqual({
      ok: true,
      event: { name: "analytics_opt_in", kind: "usage", properties: { source: "onboarding" } },
    })
  })

  it.each([
    ["an unknown event", { event: "nope", properties: {} }, ["unknown_event"]],
    [
      "a value outside the enum",
      { event: "analytics_opt_in", properties: { source: "dapp" } },
      ["source: invalid_value"],
    ],
    [
      "a missing property",
      { event: "analytics_opt_in", properties: {} },
      ["source: invalid_value"],
    ],
    [
      "an uncatalogued property",
      { event: "analytics_opt_in", properties: { source: "settings", address: "x" } },
      ["(root): unrecognized_keys address"],
    ],
    [
      "an envelope with extra keys",
      { event: "analytics_opt_in", properties: {}, at: 1 },
      ["(root): unrecognized_keys at"],
    ],
    ["no envelope", "analytics_opt_in", ["(root): invalid_type"]],
  ])("rejects %s", (_, raw, issues) => {
    expect(parseTrackedEvent(raw)).toEqual(expect.objectContaining({ ok: false, issues }))
  })

  it("reports issues without values", () => {
    const secret = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
    const result = parseTrackedEvent({ event: "analytics_opt_in", properties: { source: secret } })

    expect(JSON.stringify(result)).not.toContain(secret)
  })
})

describe("the page's screen", () => {
  const event = { event: "modal_opened", properties: { modal_id: "swap" } }

  it("rides with the event when it is a route pattern", () => {
    const result = parseTrackedEvent({ ...event, screen: "/portfolio/tokens/:symbol" })

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        event: expect.objectContaining({ screen: "/portfolio/tokens/:symbol" }),
      })
    )
  })

  it.each([
    ["a path with a symbol value", "/portfolio/tokens/USDC.e"],
    ["a query string", "/portfolio?account=5Grw"],
  ])("is dropped, never the event, when it is %s", (_, screen) => {
    const result = parseTrackedEvent({ ...event, screen })

    expect(result).toEqual({
      ok: true,
      event: { name: "modal_opened", kind: "usage", properties: { modal_id: "swap" } },
      issues: ["screen: invalid_format"],
    })
  })
})
