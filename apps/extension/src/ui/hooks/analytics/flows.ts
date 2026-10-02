import { classifyError, type ErrorCategory } from "@common/analytics/errorCategory"
import type {
  Binding,
  FlowBase,
  FlowReporter,
  FlowTypes,
  Lifecycle,
} from "@common/analytics/flow/defineFlow"
import {
  type Action,
  type Attempt,
  type Attributes,
  advance,
  beginAttempt,
  type Emission,
} from "@common/analytics/flow/machine"
import { FLOWS, type FlowName, type Flows } from "@common/analytics/flow/registry"
import type { EventProperties } from "@common/analytics/schema"
import { DEBUG } from "@common/constants"
import { log } from "@common/log"
import { pageContext } from "@ui/api/pageContext"
import { trackFlowEvent } from "@ui/api/track"
import { useEffect, useRef } from "react"

import { markInnermostOverlayCompleted } from "./useOverlayAnalytics"

const running = new Map<string, Attempt>()

/** The user finished what the overlay on top was for: modal_closed then reads completed. */
const finishes = (flow: FlowBase, lifecycle: Lifecycle) =>
  flow.finishesOverlay &&
  (lifecycle === "completed" || (lifecycle === "submitted" && flow.settlement === "transaction"))

const apply = (name: string, action: Action) => {
  const attempt = running.get(name)
  if (!attempt) {
    if (DEBUG) log.warn(`[analytics] flows.${name}: ${action.type} with no running attempt`)
    return
  }
  const next = advance(attempt, action, performance.now())
  if (next.attempt.phase === "ended") running.delete(name)
  else running.set(name, next.attempt)
  send(next.attempt.flow, next.emit)
}

const send = (flow: FlowBase, emit: readonly Emission[]) => {
  for (const { lifecycle, properties, transactionId } of emit) {
    const event = flow.eventNames[lifecycle]
    if (event) trackFlowEvent(event, properties, transactionId)
    if (finishes(flow, lifecycle)) markInnermostOverlayCompleted()
  }
}

const createReporter = (flow: FlowBase) => ({
  name: flow.name,
  def: flow,
  step: (step: string) => apply(flow.name, { type: "step", step }),
  submitted: ({
    transactionId,
    ...properties
  }: EventProperties & { transactionId?: string } = {}) =>
    apply(flow.name, { type: "submitted", properties, transactionId }),
  completed: (properties: EventProperties = {}) =>
    apply(flow.name, { type: "completed", properties }),
  failed: (cause: unknown, properties: EventProperties = {}) =>
    apply(flow.name, { type: "failed", category: classifyError(cause), properties }),
})

type Reporters = { readonly [K in FlowName]: FlowReporter<K, NonNullable<Flows[K]["types"]>> }

export const flows = Object.fromEntries(
  Object.values(FLOWS).map((flow) => [flow.name, createReporter(flow)])
) as unknown as Reporters

export type FlowStep<R extends { step(step: never): void }> = Parameters<R["step"]>[0]
export type FlowEntry<R> = R extends FlowReporter<string, infer T> ? T["entry"] : never

export const recordErrorOnInnermostFlow = (
  category: ErrorCategory
): { flow: string; flow_id: string } | null => {
  const attempt = [...running.values()].at(-1)
  if (!attempt) return null
  apply(attempt.flow.name, { type: "error_shown", category })
  return { flow: attempt.flow.name, flow_id: attempt.flowId }
}

export const onScreenReported = (screen: string) => {
  for (const [name, attempt] of running)
    if (attempt.flow.steps.some((step) => step.screen === screen))
      apply(name, { type: "screen", screen })
}

/**
 * Report from handlers and async code, never from a child's mount effect: children's effects run
 * before this hook's, when the attempt does not exist yet.
 */
export const useFlow = <N extends string, T extends FlowTypes>(
  flow: FlowReporter<N, T> | null,
  binding: Binding<T>
): void => {
  const { active = true, step, attributes } = binding
  const latest = useRef(binding)
  latest.current = binding
  const flowId = useRef<string | null>(null)
  const name = flow?.name ?? null
  const live = active && name !== null

  useEffect(() => {
    if (!flow || !active) return
    if (running.has(flow.name)) {
      if (DEBUG) log.warn(`[analytics] useFlow(flows.${flow.name}) while it already runs`)
      return
    }
    const { entry, attributes, started } = latest.current
    const begun = beginAttempt(flow.def, {
      flowId: crypto.randomUUID(),
      now: performance.now(),
      entry,
      attributes,
      started: started as EventProperties | undefined,
      screen: pageContext.screen,
    })
    flowId.current = begun.attempt.flowId
    running.set(flow.name, begun.attempt)
    send(flow.def, begun.emit)
    return () => {
      if (running.get(flow.name)?.flowId === flowId.current) apply(flow.name, { type: "leave" })
      flowId.current = null
    }
  }, [flow, active])

  // before the step: a render that changes both stamps the new step with the new attributes
  const attributesKey = JSON.stringify(attributes ?? null)
  useEffect(() => {
    const current: Attributes | null = JSON.parse(attributesKey)
    if (live && name && current && running.get(name)?.flowId === flowId.current)
      apply(name, { type: "attributes", attributes: current })
  }, [live, name, attributesKey])

  useEffect(() => {
    if (live && name && step != null && running.get(name)?.flowId === flowId.current)
      apply(name, { type: "step", step })
  }, [live, name, step])
}
