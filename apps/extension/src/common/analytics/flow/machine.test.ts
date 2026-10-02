import { describe, expect, it } from "vitest"
import { z } from "zod/v4"

import type { EventProperties } from "../schema"
import { defineFlow, type FlowBase } from "./defineFlow"
import {
  type Action,
  type Attempt,
  abandonOnPageClose,
  advance,
  beginAttempt,
  completeOnSettlement,
  type Emission,
  type Mirror,
  mirrorError,
  mirrorEvent,
  mirrorScreen,
} from "./machine"

const wizard = defineFlow("wizard", {
  subject: "running a wizard",
  steps: ["form", "review", { name: "done", screen: "/wizard/done" }],
  attributes: { source: { narrow: z.enum(["onboarding", "settings"]) } },
})

const transfer = defineFlow("transfer", {
  subject: "sending a transfer",
  steps: ["form", "review"],
  settlement: "transaction",
})

const begin = (flow: FlowBase = wizard, screen: string | null = null) =>
  beginAttempt(flow, {
    flowId: "3f2a9c1e-1b2c-4d5e-8f90-a1b2c3d4e5f6",
    now: 1_000,
    attributes: flow === wizard ? { source: "settings" } : {},
    screen,
  })

const run = (attempt: Attempt, actions: readonly Action[], now = 2_000) =>
  actions.reduce<{ attempt: Attempt; emit: Emission[] }>(
    (state, action) => {
      const next = advance(state.attempt, action, now)
      return { attempt: next.attempt, emit: [...state.emit, ...next.emit] }
    },
    { attempt, emit: [] }
  )

const names = (emit: readonly Emission[]) => emit.map(({ lifecycle }) => lifecycle)

describe("advance", () => {
  it("begins with the flow_id, the entry and the attributes", () => {
    const { attempt, emit } = begin()

    expect(attempt.phase).toBe("open")
    expect(emit).toEqual([
      {
        lifecycle: "started",
        properties: { flow_id: "3f2a9c1e-1b2c-4d5e-8f90-a1b2c3d4e5f6", source: "settings" },
      },
    ])
  })

  it("sends one step_viewed per change of step, and review, form, review as three", () => {
    const { emit } = run(begin().attempt, [
      { type: "step", step: "form" },
      { type: "step", step: "form" },
      { type: "step", step: "review" },
      { type: "step", step: "form" },
      { type: "step", step: "review" },
    ])

    expect(emit.map(({ properties }) => properties.step)).toEqual([
      "form",
      "review",
      "form",
      "review",
    ])
    expect(emit[0].properties).toMatchObject({ duration_ms: 1_000, source: "settings" })
  })

  it("records a screen-backed step without an event, from the screen on show at the start too", () => {
    const atStart = begin(wizard, "/wizard/done").attempt
    const { attempt, emit } = run(begin().attempt, [
      { type: "screen", screen: "/wizard/done" },
      { type: "step", step: "done" },
    ])

    expect(atStart.step).toBe("done")
    expect(attempt.step).toBe("done")
    expect(emit).toEqual([])
  })

  it("abandons an open attempt left in the page with its last step, once", () => {
    const { attempt, emit } = run(begin().attempt, [
      { type: "step", step: "review" },
      { type: "leave" },
      { type: "leave" },
      { type: "completed", properties: {} },
    ])

    expect(attempt.phase).toBe("ended")
    expect(names(emit)).toEqual(["step_viewed", "abandoned"])
    expect(emit[1].properties).toMatchObject({
      last_step: "review",
      abandon_cause: "left",
      duration_ms: 1_000,
    })
  })

  it("ends with exactly one terminal event, whatever follows", () => {
    const { emit } = run(begin().attempt, [
      { type: "completed", properties: {} },
      { type: "leave" },
      { type: "failed", category: "rpc", properties: {} },
      { type: "submitted", properties: {} },
      { type: "step", step: "form" },
    ])

    expect(names(emit)).toEqual(["completed"])
  })

  it("keeps a failed attempt open under the same flow_id, so a retry can complete it", () => {
    const { attempt, emit } = run(begin().attempt, [
      { type: "step", step: "review" },
      { type: "submitted", properties: {} },
      { type: "failed", category: "rpc", properties: {} },
      { type: "submitted", properties: {} },
      { type: "completed", properties: {} },
    ])

    expect(names(emit)).toEqual(["step_viewed", "submitted", "failed", "submitted", "completed"])
    expect(new Set(emit.map(({ properties }) => properties.flow_id)).size).toBe(1)
    expect(emit[2].properties).toMatchObject({ error_category: "rpc", last_step: "review" })
    expect(attempt.phase).toBe("ended")
  })

  it("puts the last error the user saw on a later abandoned", () => {
    const { emit } = run(begin().attempt, [
      { type: "error_shown", category: "wrong_password" },
      { type: "leave" },
    ])

    expect(emit).toHaveLength(1)
    expect(emit[0].properties.error_category).toBe("wrong_password")
  })

  it("stamps the current attributes, including ones changed mid-attempt", () => {
    const { emit } = run(begin().attempt, [
      { type: "attributes", attributes: { source: "onboarding" } },
      { type: "step", step: "form" },
    ])

    expect(emit[0].properties.source).toBe("onboarding")
  })

  it("abandons a submitted caller flow left before it completed", () => {
    const { emit } = run(begin().attempt, [
      { type: "submitted", properties: {} },
      { type: "leave" },
    ])

    expect(names(emit)).toEqual(["submitted", "abandoned"])
  })

  it("leaves a submitted transaction flow to the worker, and links the transaction", () => {
    const { emit } = run(begin(transfer).attempt, [
      { type: "submitted", properties: {}, transactionId: "0xabc" },
      { type: "leave" },
    ])

    expect(emit).toEqual([
      expect.objectContaining({ lifecycle: "submitted", transactionId: "0xabc" }),
    ])
  })

  it("writes the last step under the flow's alias on abandoned only", () => {
    const aliased = defineFlow("aliased", {
      subject: "testing an alias",
      steps: ["form", "review"],
      lastStepAlias: "step",
    })
    const { emit } = run(begin(aliased).attempt, [
      { type: "step", step: "review" },
      { type: "failed", category: "rpc", properties: {} },
      { type: "leave" },
    ])

    expect(emit[1].properties).toMatchObject({ last_step: "review" })
    expect(emit[2].properties).toMatchObject({ step: "review" })
    expect(emit[2].properties).not.toHaveProperty("last_step")
    expect(aliased.events.aliased_abandoned.schema.safeParse(emit[2].properties).success).toBe(true)
  })
})

describe("the worker's mirror", () => {
  const ref = (flow: FlowBase, lifecycle: Emission["lifecycle"]) => ({ flow, lifecycle })

  const replay = (flow: FlowBase, actions: readonly Action[]) => {
    const started = begin(flow)
    let attempt = started.attempt
    let mirror: Mirror | null = null
    const feed = (emission: Emission) => {
      mirror = mirrorEvent(mirror, ref(flow, emission.lifecycle), emission.properties, {
        now: 0,
        screen: null,
        transactionId: emission.transactionId,
      })
    }
    started.emit.forEach(feed)
    for (const action of actions) {
      const next = advance(attempt, action, 2_000)
      attempt = next.attempt
      next.emit.forEach(feed)
      if (mirror && attempt.phase !== "ended") {
        if (action.type === "screen") mirror = mirrorScreen(mirror, action.screen)
        if (action.type === "error_shown") mirror = mirrorError(mirror, action.category)
      }
    }
    return { attempt, mirror: mirror as Mirror | null }
  }

  const ACTIONS: readonly Action[] = [
    { type: "step", step: "form" },
    { type: "step", step: "review" },
    { type: "screen", screen: "/wizard/done" },
    { type: "attributes", attributes: { source: "onboarding" } },
    { type: "submitted", properties: {} },
    { type: "failed", category: "rpc", properties: {} },
    { type: "error_shown", category: "wrong_password" },
    { type: "completed", properties: {} },
    { type: "leave" },
  ]

  it("agrees with the page's attempt on phase, step and error, on random action sequences", () => {
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let round = 0; round < 500; round++) {
      const actions = Array.from(
        { length: 1 + Math.floor(random() * 8) },
        () => ACTIONS[Math.floor(random() * ACTIONS.length)]
      )
      const { attempt, mirror } = replay(wizard, actions)
      if (attempt.phase === "ended") expect(mirror, JSON.stringify(actions)).toBeNull()
      else
        expect(
          mirror && { phase: mirror.phase, step: mirror.step, lastError: mirror.lastError },
          JSON.stringify(actions)
        ).toEqual({ phase: attempt.phase, step: attempt.step, lastError: attempt.lastError })
    }
  })

  it("ignores events for an attempt it never saw start", () => {
    const step: EventProperties = { flow_id: "other", step: "form", duration_ms: 1 }

    expect(mirrorEvent(null, ref(wizard, "step_viewed"), step, { now: 0, screen: null })).toBeNull()
  })

  it("abandons an open mirror as page_closed, timed from the started event's arrival", () => {
    const opened = mirrorEvent(
      null,
      ref(wizard, "started"),
      { flow_id: "a", source: "settings" },
      { now: 10_000, screen: "/wizard/done" }
    ) as Mirror

    expect(abandonOnPageClose(opened, 13_000)).toEqual({
      lifecycle: "abandoned",
      properties: {
        flow_id: "a",
        source: "settings",
        last_step: "done",
        duration_ms: 3_000,
        abandon_cause: "page_closed",
      },
    })
  })

  it("leaves a submitted transaction flow to its settlement, which completes it with the status", () => {
    const opened = mirrorEvent(
      null,
      ref(transfer, "started"),
      { flow_id: "t" },
      { now: 0, screen: null }
    )
    const submitted = mirrorEvent(
      opened,
      ref(transfer, "submitted"),
      { flow_id: "t", duration_ms: 5 },
      { now: 0, screen: null, transactionId: "0xabc" }
    ) as Mirror

    expect(submitted.transactionId).toBe("0xabc")
    expect(abandonOnPageClose(submitted, 1)).toBeNull()
    const completed = completeOnSettlement(
      submitted,
      { status: "success", timeToSettleMs: 400 },
      9_000
    )
    expect(completed.properties).toEqual({
      flow_id: "t",
      duration_ms: 9_000,
      status: "success",
      time_to_settle_ms: 400,
    })
    expect(transfer.events.transfer_completed.schema.safeParse(completed.properties).success).toBe(
      true
    )
  })
})
