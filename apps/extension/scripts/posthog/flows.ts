import type { FlowBase, Lifecycle } from "@common/analytics/flow/defineFlow"
import type { FlowName } from "@common/analytics/flow/registry"

import {
  type EventsNode,
  ev,
  funnel,
  type PropertyFilter,
  prop,
  sqlList,
  sqlString,
  trend,
  type VizQuery,
} from "./queries"

export type Flow = Pick<
  FlowBase,
  "name" | "subject" | "steps" | "settlement" | "abandonedStepProperty" | "eventNames"
>

const eventOf = (flow: Flow, lifecycle: Lifecycle) => flow.eventNames[lifecycle]

const SUCCESS_OVERRIDES: { readonly [N in FlowName]?: PropertyFilter } = {
  swap: prop("swap_status", "finished"),
}
const successOverrides = new Map<string, PropertyFilter>(Object.entries(SUCCESS_OVERRIDES))

export const successFilter = (flow: Flow): PropertyFilter | undefined =>
  successOverrides.get(flow.name) ??
  (flow.settlement === "transaction" ? prop("status", "success") : undefined)

export const flowFunnelSteps = (flow: Flow): EventsNode[] => {
  const started = eventOf(flow, "started")
  const completed = eventOf(flow, "completed")
  if (!started || !completed)
    throw new Error(`Flow "${flow.name}" has no started or completed event`)
  const stepViewed = eventOf(flow, "step_viewed")
  const steps = flow.steps.map(({ name, screen }) => {
    if (screen !== undefined)
      return ev("$screen", { name, optional: true, properties: [prop("$screen_name", screen)] })
    if (!stepViewed) throw new Error(`Flow "${flow.name}": step "${name}" has no step_viewed event`)
    return ev(stepViewed, { name, optional: true, properties: [prop("step", name)] })
  })
  const submitted = eventOf(flow, "submitted")
  const success = successFilter(flow)
  return [
    ev(started, { name: "started" }),
    ...steps,
    ...(submitted ? [ev(submitted, { name: "submitted" })] : []),
    success
      ? ev(completed, { name: "completed (success)", properties: [success] })
      : ev(completed, { name: "completed" }),
  ]
}

export const flowFunnel = (flow: Flow): VizQuery =>
  funnel({ steps: flowFunnelSteps(flow), window: 1, windowUnit: "day" })

export const flowAbandonment = (flow: Flow): VizQuery => {
  const abandoned = eventOf(flow, "abandoned")
  if (!abandoned) throw new Error(`Flow "${flow.name}" has no abandoned event`)
  return trend({
    series: [ev(abandoned, { name: "abandoned" })],
    breakdown: flow.abandonedStepProperty,
    display: "ActionsBarValue",
  })
}

const flowEvents = (flows: readonly Flow[]) =>
  flows.flatMap((flow) =>
    Object.entries(flow.eventNames).map(([lifecycle, event]) => ({
      flow: flow.name,
      lifecycle,
      event: event as string,
    }))
  )

const multiIf = (arms: readonly [string, string][], otherwise: string) =>
  arms.length
    ? `multiIf(${arms.map(([when, then]) => `${when}, ${then}`).join(", ")}, ${otherwise})`
    : otherwise

export const flowEventColumns = (flows: readonly Flow[]) => {
  const events = flowEvents(flows)
  const byEvent = (pick: (e: (typeof events)[number]) => string) =>
    multiIf(
      events.map((e) => [`event = ${sqlString(e.event)}`, sqlString(pick(e))]),
      "''"
    )
  const aliased = flows.filter((flow) => flow.abandonedStepProperty !== "last_step")
  const lastStep = multiIf(
    aliased.flatMap((flow) => {
      const abandoned = eventOf(flow, "abandoned")
      return abandoned
        ? [
            [`event = ${sqlString(abandoned)}`, `properties.${flow.abandonedStepProperty}`] as [
              string,
              string,
            ],
          ]
        : []
    }),
    "properties.last_step"
  )
  const succeeded = multiIf(
    flows.flatMap((flow) => {
      const completed = eventOf(flow, "completed")
      const success = successFilter(flow)
      return completed && success
        ? [
            [
              `event = ${sqlString(completed)}`,
              `ifNull(toString(properties.${success.key}), '') IN (${sqlList((success.value ?? []).map(String))})`,
            ] as [string, string],
          ]
        : []
    }),
    "1"
  )
  return {
    select: [
      `${byEvent((e) => e.flow)} AS flow`,
      `${byEvent((e) => e.lifecycle)} AS lifecycle`,
      "properties.flow_id AS attempt",
      `${lastStep} AS last_step`,
      `${succeeded} AS succeeded`,
    ].join(",\n    "),
    where: `event IN (${events.map((e) => sqlString(e.event)).join(", ")})`,
  }
}
