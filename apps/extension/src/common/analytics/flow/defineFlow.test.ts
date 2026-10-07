import { redactSecrets } from "@core/domains/analytics/redactSecrets"
import { describe, expect, it } from "vitest"
import { z } from "zod/v4"

import { catalogue } from "../catalogue"
import type { PropsOfEvent } from "../schema"
import { type Binding, defineFlow, type FlowReporter } from "./defineFlow"
import { FLOWS, type FlowName } from "./registry"

const swapLike = defineFlow("swap_like", {
  subject: "swapping tokens",
  steps: ["form", "confirm", { name: "done", screen: "/swap/done" }],
  entries: ["dashboard", "token_details"],
  attributes: { source: { narrow: z.enum(["onboarding", "settings"]) } },
  extras: { submitted: { signer: "required" } },
  settlement: "transaction",
  omit: ["failed"],
  rename: { started: "swap_like_opened" },
})

const typeChecks = () => {
  type Events = typeof swapLike.events
  type Started = PropsOfEvent<Events["swap_like_opened"]>
  const startedOk: Started = { flow_id: "x", entry: "dashboard", source: "settings" }
  // @ts-expect-error an entry outside the flow's own list
  const startedBadEntry: Started = { flow_id: "x", entry: "nowhere", source: "settings" }
  // @ts-expect-error an attribute the flow declares is required on every event
  const startedNoAttribute: Started = { flow_id: "x", entry: "dashboard" }

  type Step = PropsOfEvent<Events["swap_like_step_viewed"]>
  const stepOk: Step = { flow_id: "x", step: "form", duration_ms: 1, source: "settings" }
  // @ts-expect-error a screen-backed step is never a step_viewed
  const stepScreen: Step = { flow_id: "x", step: "done", duration_ms: 1, source: "settings" }

  type Completed = PropsOfEvent<Events["swap_like_completed"]>
  const completedOk: Completed = {
    flow_id: "x",
    duration_ms: 1,
    source: "settings",
    status: "success",
    time_to_settle_ms: 1,
  }
  // @ts-expect-error an omitted lifecycle has no event
  type NoFailed = Events["swap_like_failed"]
  // @ts-expect-error a renamed lifecycle has no generated name
  type NoStarted = Events["swap_like_started"]

  type Reporter = FlowReporter<"swap_like", NonNullable<typeof swapLike.types>>
  const reporter = {} as Reporter
  reporter.step("done")
  // @ts-expect-error not a step of this flow
  reporter.step("nope")
  reporter.submitted({ signer: "local", transactionId: "0xabc" })
  // @ts-expect-error a transaction flow's submitted carries its transaction
  reporter.submitted({ signer: "local" })
  // @ts-expect-error a required submitted extra
  reporter.submitted({ transactionId: "0xabc" })
  // @ts-expect-error the worker completes a transaction flow
  reporter.completed
  // @ts-expect-error omitted
  reporter.failed

  type Bind = Binding<NonNullable<typeof swapLike.types>>
  const bindOk: Bind = { entry: "dashboard", attributes: { source: "settings" } }
  // @ts-expect-error entry is required when the flow lists entries
  const bindNoEntry: Bind = { attributes: { source: "settings" } }
  // @ts-expect-error attributes are required when the flow declares them
  const bindNoAttributes: Bind = { entry: "dashboard" }

  type Pilot = PropsOfEvent<typeof catalogue.recovery_phrase_backup_completed>
  const pilotCompleted: Pilot = { flow_id: "x", duration_ms: 1, verified: true }
  // @ts-expect-error verified is the pilot's required completed extra
  const pilotNoVerified: Pilot = { flow_id: "x", duration_ms: 1 }
  const pilotName: FlowName = "recovery_phrase_backup"
  // @ts-expect-error not a registered flow
  const otherName: FlowName = "nope"

  return [
    startedOk,
    startedBadEntry,
    startedNoAttribute,
    stepOk,
    stepScreen,
    completedOk,
    bindOk,
    bindNoEntry,
    bindNoAttributes,
    pilotCompleted,
    pilotNoVerified,
    pilotName,
    otherName,
  ] as unknown as [NoFailed, NoStarted]
}

describe("defineFlow", () => {
  it("rejects bad shapes at compile time: `pnpm typecheck` checks the @ts-expect-error lines", () => {
    expect(typeChecks).toBeTypeOf("function")
  })

  it("generates an event per lifecycle, named after the flow", () => {
    expect(Object.keys(FLOWS.recovery_phrase_backup.events)).toEqual([
      "recovery_phrase_backup_started",
      "recovery_phrase_backup_step_viewed",
      "recovery_phrase_backup_submitted",
      "recovery_phrase_backup_completed",
      "recovery_phrase_backup_failed",
      "recovery_phrase_backup_abandoned",
    ])
    for (const name of Object.keys(FLOWS.recovery_phrase_backup.events))
      expect(Object.hasOwn(catalogue, name), name).toBe(true)
  })

  it("drops what omit lists, uses a rename, and has no step_viewed when every step is a screen", () => {
    const routes = defineFlow("routes", {
      subject: "walking routes",
      steps: [{ name: "one", screen: "/one" }],
      omit: ["submitted", "failed"],
    })

    expect(Object.keys(swapLike.events)).toEqual([
      "swap_like_opened",
      "swap_like_step_viewed",
      "swap_like_submitted",
      "swap_like_completed",
      "swap_like_abandoned",
    ])
    expect(Object.keys(routes.events)).toEqual([
      "routes_started",
      "routes_completed",
      "routes_abandoned",
    ])
  })

  it("narrows entry, step and last_step to the flow's own values at the parser", () => {
    const { swap_like_opened, swap_like_step_viewed, swap_like_abandoned } = swapLike.events
    const base = { flow_id: "x", source: "settings" }

    expect(swap_like_opened.schema.safeParse({ ...base, entry: "dashboard" }).success).toBe(true)
    expect(swap_like_opened.schema.safeParse({ ...base, entry: "send" }).success).toBe(false)
    expect(
      swap_like_step_viewed.schema.safeParse({ ...base, step: "done", duration_ms: 1 }).success
    ).toBe(false)
    const abandoned = { ...base, duration_ms: 1, abandon_cause: "left" }
    expect(swap_like_abandoned.schema.safeParse({ ...abandoned, last_step: "done" }).success).toBe(
      true
    )
    expect(swap_like_abandoned.schema.safeParse({ ...abandoned, last_step: "x" }).success).toBe(
      false
    )
    expect(swap_like_abandoned.schema.safeParse(abandoned).success).toBe(true)
    const { source: _, ...noAttribute } = abandoned
    expect(swap_like_abandoned.schema.safeParse(noAttribute).success).toBe(false)
  })

  it("adds status and time_to_settle_ms to a transaction flow's completed", () => {
    expect(swapLike.events.swap_like_completed.properties).toEqual(
      expect.arrayContaining(["status", "time_to_settle_ms"])
    )
    expect(FLOWS.recovery_phrase_backup.events.recovery_phrase_backup_completed.properties).toEqual(
      ["flow_id", "duration_ms", "verified"]
    )
  })

  it("rejects a non snake_case name, a step named twice, and a screen that is no route pattern", () => {
    expect(() => defineFlow("Bad-Name", { subject: "x", steps: ["a"] })).toThrow("snake_case")
    expect(() => defineFlow("twice", { subject: "x", steps: ["a", "a"] })).toThrow("twice")
    expect(() =>
      defineFlow("screen", { subject: "x", steps: [{ name: "a", screen: "send/0x12" }] })
    ).toThrow("route pattern")
  })

  it("describes every generated event in a sentence from the subject", () => {
    for (const { description } of Object.values(swapLike.events)) {
      expect(description).toContain("swapping tokens")
      expect(description).toMatch(/\.$/)
    }
  })

  it("mints flow ids that redaction leaves untouched", () => {
    const flowId = crypto.randomUUID()

    expect(redactSecrets(flowId)).toBe(flowId)
  })
})
