import { type ErrorCategory, isErrorCategory } from "../errorCategory"
import { type EventProperties, toDurationMs } from "../schema"
import type { SettledStatus } from "../transactions"
import type { FlowBase, Lifecycle } from "./defineFlow"
import type { FlowEventRef } from "./registry"

export type Phase = "open" | "submitted" | "ended"

export type Attributes = EventProperties

export type Attempt = {
  readonly flowId: string
  readonly flow: FlowBase
  readonly startedAt: number
  readonly phase: Phase
  readonly step: string | null
  readonly lastError: ErrorCategory | null
  readonly attributes: Attributes
}

export type Emission = {
  readonly lifecycle: Lifecycle
  readonly properties: EventProperties
  readonly transactionId?: string
}

export type Action =
  | { readonly type: "step"; readonly step: string }
  | { readonly type: "screen"; readonly screen: string }
  | { readonly type: "attributes"; readonly attributes: Attributes }
  | {
      readonly type: "submitted"
      readonly properties: EventProperties
      readonly transactionId?: string
    }
  | { readonly type: "completed"; readonly properties: EventProperties }
  | {
      readonly type: "failed"
      readonly category: ErrorCategory
      readonly properties: EventProperties
    }
  | { readonly type: "error_shown"; readonly category: ErrorCategory }
  | { readonly type: "leave" }

export type Transition = { readonly attempt: Attempt; readonly emit: readonly Emission[] }

export type BeginInput = {
  readonly flowId: string
  readonly now: number
  readonly entry?: string
  readonly attributes?: Attributes
  readonly started?: EventProperties
  readonly screen: string | null
}

const stepOfScreen = (flow: FlowBase, screen: string | null): string | null =>
  flow.steps.find((step) => step.screen !== undefined && step.screen === screen)?.name ?? null

const isScreenStep = (flow: FlowBase, step: string) =>
  flow.steps.some((candidate) => candidate.name === step && candidate.screen !== undefined)

type Stampable = Pick<Attempt, "flowId" | "attributes">

const stamp = ({ flowId, attributes }: Stampable): EventProperties => ({
  flow_id: flowId,
  ...attributes,
})

const lastStep = (step: string | null, property = "last_step"): EventProperties =>
  step === null ? {} : { [property]: step }

const endsOnSettlement = (flow: FlowBase, phase: Phase) =>
  phase === "submitted" && flow.settlement === "transaction"

export const beginAttempt = (flow: FlowBase, input: BeginInput): Transition => {
  const attempt: Attempt = {
    flowId: input.flowId,
    flow,
    startedAt: input.now,
    phase: "open",
    step: stepOfScreen(flow, input.screen),
    lastError: null,
    attributes: input.attributes ?? {},
  }
  const properties = {
    ...stamp(attempt),
    ...(input.entry !== undefined && { entry: input.entry }),
    ...input.started,
  }
  return { attempt, emit: [{ lifecycle: "started", properties }] }
}

export const advance = (attempt: Attempt, action: Action, now: number): Transition => {
  const unchanged = { attempt, emit: [] }
  if (attempt.phase === "ended") return unchanged

  const elapsed = { duration_ms: toDurationMs(now - attempt.startedAt) }
  const { flow } = attempt

  switch (action.type) {
    case "step": {
      if (action.step === attempt.step) return unchanged
      const next = { ...attempt, step: action.step }
      if (isScreenStep(flow, action.step)) return { attempt: next, emit: [] }
      const properties = { ...stamp(attempt), step: action.step, ...elapsed }
      return { attempt: next, emit: [{ lifecycle: "step_viewed", properties }] }
    }
    case "screen": {
      const step = stepOfScreen(flow, action.screen)
      return step === null ? unchanged : { attempt: { ...attempt, step }, emit: [] }
    }
    case "attributes":
      return { attempt: { ...attempt, attributes: action.attributes }, emit: [] }
    case "error_shown":
      return { attempt: { ...attempt, lastError: action.category }, emit: [] }
    case "submitted": {
      const properties = {
        ...stamp(attempt),
        ...lastStep(attempt.step),
        ...elapsed,
        ...action.properties,
      }
      return {
        attempt: { ...attempt, phase: "submitted" },
        emit: [{ lifecycle: "submitted", properties, transactionId: action.transactionId }],
      }
    }
    case "completed": {
      const properties = { ...stamp(attempt), ...elapsed, ...action.properties }
      return {
        attempt: { ...attempt, phase: "ended" },
        emit: [{ lifecycle: "completed", properties }],
      }
    }
    case "failed": {
      const properties = {
        ...stamp(attempt),
        ...lastStep(attempt.step),
        error_category: action.category,
        ...elapsed,
        ...action.properties,
      }
      return {
        attempt: { ...attempt, phase: "open", lastError: action.category },
        emit: [{ lifecycle: "failed", properties }],
      }
    }
    case "leave": {
      const ended = { ...attempt, phase: "ended" as const }
      if (endsOnSettlement(flow, attempt.phase)) return { attempt: ended, emit: [] }
      return { attempt: ended, emit: [abandonment(attempt, "left", elapsed.duration_ms)] }
    }
  }
}

const abandonment = (
  { flowId, flow, step, lastError, attributes }: Omit<Attempt, "startedAt" | "phase">,
  cause: "left" | "page_closed",
  durationMs: number
): Emission => ({
  lifecycle: "abandoned",
  properties: {
    ...stamp({ flowId, attributes }),
    ...lastStep(step, flow.abandonedStepProperty),
    duration_ms: durationMs,
    abandon_cause: cause,
    ...(lastError && { error_category: lastError }),
  },
})

export type Mirror = Omit<Attempt, "startedAt"> & {
  readonly startedAtEpochMs: number
  readonly transactionId: string | null
}

const attributesIn = (flow: FlowBase, properties: EventProperties): Attributes =>
  Object.fromEntries(
    flow.attributes.flatMap((key) => {
      const value = properties[key]
      return value === undefined ? [] : [[key, value]]
    })
  )

const errorCategoryIn = (properties: EventProperties): ErrorCategory | null => {
  const value = properties.error_category
  return isErrorCategory(value) ? value : null
}

export const stringIn = (properties: EventProperties, key: string): string | null => {
  const value = properties[key]
  return typeof value === "string" ? value : null
}

export const mirrorEvent = (
  mirror: Mirror | null,
  { flow, lifecycle }: FlowEventRef,
  properties: EventProperties,
  { now, screen, transactionId }: { now: number; screen: string | null; transactionId?: string }
): Mirror | null => {
  const flowId = stringIn(properties, "flow_id")
  if (lifecycle === "started")
    return flowId === null
      ? null
      : {
          flowId,
          flow,
          startedAtEpochMs: now,
          phase: "open",
          step: stepOfScreen(flow, screen),
          lastError: null,
          attributes: attributesIn(flow, properties),
          transactionId: null,
        }
  if (!mirror || mirror.flowId !== flowId) return mirror
  const current = { ...mirror, attributes: attributesIn(flow, properties) }

  switch (lifecycle) {
    case "step_viewed":
      return { ...current, step: stringIn(properties, "step") ?? current.step }
    case "submitted":
      return { ...current, phase: "submitted", transactionId: transactionId ?? null }
    case "failed":
      return {
        ...current,
        phase: "open",
        lastError: errorCategoryIn(properties),
      }
    case "completed":
    case "abandoned":
      return null
  }
}

export const mirrorScreen = (mirror: Mirror, screen: string): Mirror => ({
  ...mirror,
  step: stepOfScreen(mirror.flow, screen) ?? mirror.step,
})

export const mirrorError = (mirror: Mirror, category: ErrorCategory): Mirror => ({
  ...mirror,
  lastError: category,
})

export const abandonOnPageClose = (mirror: Mirror, now: number): Emission | null =>
  endsOnSettlement(mirror.flow, mirror.phase)
    ? null
    : abandonment(mirror, "page_closed", toDurationMs(now - mirror.startedAtEpochMs))

export type Settled = {
  readonly status: SettledStatus
  readonly timeToSettleMs: number
  readonly properties?: EventProperties
}

const declaredOnCompleted = (flow: FlowBase, properties: EventProperties): EventProperties => {
  const event = flow.eventNames.completed
  const declared = (event && flow.events[event]?.properties) || []
  return Object.fromEntries(Object.entries(properties).filter(([key]) => declared.includes(key)))
}

export const completeOnSettlement = (mirror: Mirror, settled: Settled, now: number): Emission => ({
  lifecycle: "completed",
  properties: {
    ...declaredOnCompleted(mirror.flow, settled.properties ?? {}),
    ...stamp(mirror),
    duration_ms: toDurationMs(now - mirror.startedAtEpochMs),
    status: settled.status,
    time_to_settle_ms: settled.timeToSettleMs,
  },
})
