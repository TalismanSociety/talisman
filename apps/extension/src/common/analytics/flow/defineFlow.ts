import { z } from "zod/v4"

import { properties } from "../properties"
import {
  defineEventGroup,
  type EventDef,
  type EventGroup,
  mergeEventGroups,
  type PropertyUse,
  type PropertyValueOf,
  type PropsOf,
  type TrackArgsOf,
  type UnionToIntersection,
} from "../schema"

type Registry = typeof properties

export type Uses = { readonly [K in keyof Registry]?: PropertyUse<PropertyValueOf<Registry[K]>> }

export const LIFECYCLES = [
  "started",
  "step_viewed",
  "submitted",
  "completed",
  "failed",
  "abandoned",
] as const
export type Lifecycle = (typeof LIFECYCLES)[number]

export type Omittable = "submitted" | "failed"
export type Settlement = "caller" | "transaction"

export type ScreenStep = { readonly name: string; readonly screen: string }
export type StepSpec = string | ScreenStep

type ExtraLifecycle = Exclude<Lifecycle, "step_viewed">
export type Extras = { readonly [L in ExtraLifecycle]?: Uses }

type NameOfStep<S> = S extends string
  ? S
  : S extends { readonly name: infer N extends string }
    ? N
    : never
type EmittedStep<S> = S extends string ? S : never

export type FlowTypes = {
  step: string
  emittedStep: string
  entry: string
  attributes: Uses
  extras: Extras
  settlement: Settlement
  omit: Omittable
  rename: Partial<Record<Lifecycle, string>>
  alias: string
}

type None = Record<never, never>
type ExtraOf<X, L extends string> = X extends { readonly [K in L]: infer U } ? U : None
type Narrow<V> = { readonly narrow: z.ZodType<V> }
type OptionalNarrow<V> = Narrow<V> & { readonly optional: true }

type EntryUse<T extends FlowTypes> = [T["entry"]] extends [never]
  ? None
  : { readonly entry: Narrow<T["entry"]> }
type LastStepUse<T extends FlowTypes, Abandoned extends boolean> = Abandoned extends true
  ? [T["alias"]] extends [never]
    ? { readonly last_step: OptionalNarrow<T["step"]> }
    : { readonly [A in T["alias"]]: OptionalNarrow<T["step"]> }
  : { readonly last_step: OptionalNarrow<T["step"]> }
type Stamped<T extends FlowTypes> = { readonly flow_id: "required" } & T["attributes"]

export type UsesOfLifecycle<T extends FlowTypes, L extends Lifecycle> = L extends "started"
  ? Stamped<T> & EntryUse<T> & ExtraOf<T["extras"], "started">
  : L extends "step_viewed"
    ? Stamped<T> & { readonly step: Narrow<T["emittedStep"]>; readonly duration_ms: "required" }
    : L extends "submitted"
      ? Stamped<T> &
          LastStepUse<T, false> & { readonly duration_ms: "required" } & ExtraOf<
            T["extras"],
            "submitted"
          >
      : L extends "completed"
        ? Stamped<T> & { readonly duration_ms: "required" } & (T["settlement"] extends "transaction"
              ? { readonly status: "required"; readonly time_to_settle_ms: "required" }
              : None) &
            ExtraOf<T["extras"], "completed">
        : L extends "failed"
          ? Stamped<T> &
              LastStepUse<T, false> & {
                readonly error_category: "required"
                readonly duration_ms: "required"
              } & ExtraOf<T["extras"], "failed">
          : Stamped<T> &
              LastStepUse<T, true> & {
                readonly duration_ms: "required"
                readonly abandon_cause: "required"
                readonly error_category: "optional"
              } & ExtraOf<T["extras"], "abandoned">

type LifecyclesOf<T extends FlowTypes> =
  | "started"
  | "completed"
  | "abandoned"
  | ([T["emittedStep"]] extends [never] ? never : "step_viewed")
  | Exclude<Omittable, T["omit"]>

type EventNameOf<N extends string, T extends FlowTypes, L extends Lifecycle> = T["rename"] extends {
  readonly [K in L]: infer R extends string
}
  ? R
  : `${N}_${L}`

export type FlowEvents<N extends string, T extends FlowTypes> = {
  readonly [L in LifecyclesOf<T> as EventNameOf<N, T, L>]: EventDef<
    PropsOf<Registry, UsesOfLifecycle<T, L>>
  >
}

export type ResolvedStep = { readonly name: string; readonly screen?: string }

export type FlowBase = {
  readonly name: string
  readonly subject: string
  readonly steps: readonly ResolvedStep[]
  readonly entries: readonly string[]
  readonly attributes: readonly string[]
  readonly settlement: Settlement
  readonly omit: readonly Omittable[]
  readonly finishesOverlay: boolean
  readonly abandonedStepProperty: string
  readonly eventNames: { readonly [L in Lifecycle]?: string }
  readonly events: EventGroup
}

export type FlowDef<N extends string = string, T extends FlowTypes = FlowTypes> = Omit<
  FlowBase,
  "name" | "events"
> & {
  readonly name: N
  readonly events: FlowEvents<N, T>
  /** Never set: it carries the flow's types to `FlowReporter` and `Binding`. */
  readonly types?: T
}

type FlowInput<
  Steps extends readonly [StepSpec, ...StepSpec[]],
  Entries extends string,
  A extends Uses,
  X extends Extras,
  S extends Settlement,
  O extends Omittable,
  R extends Partial<Record<Lifecycle, string>>,
  Alias extends keyof Registry & string,
> = {
  readonly subject: string
  readonly steps: Steps
  readonly entries?: readonly [Entries, ...Entries[]]
  readonly attributes?: A
  readonly extras?: X
  readonly settlement?: S
  readonly omit?: readonly O[]
  readonly rename?: R
  readonly lastStepAlias?: Alias
  /** false for a flow nested in another flow's modal: its end is not what the modal was for. */
  readonly finishesOverlay?: boolean
}

type TypesOf<
  Steps extends readonly StepSpec[],
  Entries extends string,
  A extends Uses,
  X extends Extras,
  S extends Settlement,
  O extends Omittable,
  R extends Partial<Record<Lifecycle, string>>,
  Alias extends string,
> = {
  step: NameOfStep<Steps[number]>
  emittedStep: EmittedStep<Steps[number]>
  entry: Entries
  attributes: A
  extras: X
  settlement: S
  omit: O
  rename: R
  alias: Alias
}

const FLOW_NAME = /^[a-z][a-z0-9_]*$/

const describe = (
  lifecycle: Lifecycle,
  subject: string,
  settlement: Settlement,
  abandonedStepProperty: string
): string => {
  switch (lifecycle) {
    case "started":
      return `The user started ${subject}.`
    case "step_viewed":
      return `A step of ${subject} was shown, once per change of step.`
    case "submitted":
      return settlement === "transaction"
        ? `The user confirmed ${subject} and the transaction was sent. completed follows when it settles.`
        : `The user confirmed ${subject}.`
    case "completed":
      return settlement === "transaction"
        ? `The transaction sent while ${subject} reached its final status, even when the page had closed.`
        : `The user finished ${subject}.`
    case "failed":
      return `An attempt at ${subject} failed and the user can try again under the same flow_id.`
    case "abandoned":
      return `The user left ${subject} unfinished. ${abandonedStepProperty} is the step they left on.`
  }
}

export const defineFlow = <
  const N extends string,
  const Steps extends readonly [StepSpec, ...StepSpec[]],
  const Entries extends string = never,
  const A extends Uses = None,
  const X extends Extras = None,
  const S extends Settlement = "caller",
  const O extends Omittable = never,
  const R extends Partial<Record<Lifecycle, string>> = None,
  const Alias extends keyof Registry & string = never,
>(
  name: N,
  input: FlowInput<Steps, Entries, A, X, S, O, R, Alias>
): FlowDef<N, TypesOf<Steps, Entries, A, X, S, O, R, Alias>> => {
  if (!FLOW_NAME.test(name)) throw new Error(`Flow name "${name}" is not snake_case`)
  const steps: ResolvedStep[] = input.steps.map((spec) =>
    typeof spec === "string" ? { name: spec } : spec
  )
  const stepNames = steps.map((step) => step.name) as [string, ...string[]]
  if (new Set(stepNames).size !== stepNames.length)
    throw new Error(`Flow "${name}" names a step twice`)
  for (const { name: step, screen } of steps) {
    if (!properties.step.schema.safeParse(step).success)
      throw new Error(`Flow "${name}": step "${step}" is not a slug`)
    if (screen !== undefined && !properties.$screen_name.schema.safeParse(screen).success)
      throw new Error(`Flow "${name}": screen "${screen}" is not a route pattern`)
  }
  const emitted = steps.filter((step) => step.screen === undefined).map((step) => step.name)

  const settlement: Settlement = input.settlement ?? "caller"
  const omit: readonly Omittable[] = input.omit ?? []
  const abandonedStepProperty = input.lastStepAlias ?? "last_step"
  const lifecycles = LIFECYCLES.filter(
    (lifecycle) =>
      !omit.includes(lifecycle as Omittable) && (lifecycle !== "step_viewed" || emitted.length)
  )
  const eventNames = Object.fromEntries(
    lifecycles.map((lifecycle) => [lifecycle, input.rename?.[lifecycle] ?? `${name}_${lifecycle}`])
  ) as { readonly [L in Lifecycle]?: string }

  const stamped: Uses = { flow_id: "required", ...input.attributes }
  const lastStep = { narrow: z.enum(stepNames), optional: true } as const
  const extras = (lifecycle: ExtraLifecycle): Uses => input.extras?.[lifecycle] ?? {}
  const usesOf = (lifecycle: Lifecycle): Uses => {
    switch (lifecycle) {
      case "started":
        return {
          ...stamped,
          ...(input.entries && { entry: { narrow: z.enum(input.entries) } }),
          ...extras("started"),
        }
      case "step_viewed":
        return {
          ...stamped,
          step: { narrow: z.enum(emitted as [string, ...string[]]) },
          duration_ms: "required",
        }
      case "submitted":
        return { ...stamped, last_step: lastStep, duration_ms: "required", ...extras("submitted") }
      case "completed":
        return {
          ...stamped,
          duration_ms: "required",
          ...(settlement === "transaction" && {
            status: "required",
            time_to_settle_ms: "required",
          }),
          ...extras("completed"),
        }
      case "failed":
        return {
          ...stamped,
          last_step: lastStep,
          error_category: "required",
          duration_ms: "required",
          ...extras("failed"),
        }
      case "abandoned":
        return {
          ...stamped,
          [abandonedStepProperty]: lastStep,
          duration_ms: "required",
          abandon_cause: "required",
          error_category: "optional",
          ...extras("abandoned"),
        }
    }
  }

  const events = defineEventGroup(
    properties,
    Object.fromEntries(
      lifecycles.map((lifecycle) => [
        eventNames[lifecycle],
        {
          description: describe(lifecycle, input.subject, settlement, abandonedStepProperty),
          props: usesOf(lifecycle),
        },
      ])
    )
  )

  return {
    name,
    subject: input.subject,
    steps,
    entries: input.entries ?? [],
    attributes: Object.keys(input.attributes ?? {}),
    settlement,
    omit,
    finishesOverlay: input.finishesOverlay ?? true,
    abandonedStepProperty,
    eventNames,
    events: events as unknown as FlowEvents<N, TypesOf<Steps, Entries, A, X, S, O, R, Alias>>,
  }
}

export type AnyFlowRegistry = Readonly<Record<string, FlowBase>>

export const flowRegistry = <const Fs extends readonly FlowBase[]>(
  ...flows: Fs
): { readonly [F in Fs[number] as F["name"]]: F } => {
  const registry: Record<string, FlowBase> = {}
  for (const flow of flows) {
    if (Object.hasOwn(registry, flow.name)) throw new Error(`Duplicate flow "${flow.name}"`)
    registry[flow.name] = flow
  }
  return registry as { readonly [F in Fs[number] as F["name"]]: F }
}

export type FlowEventGroup<R extends AnyFlowRegistry> = UnionToIntersection<
  { [K in keyof R]: R[K]["events"] }[keyof R]
>

export const flowEventGroup = <const R extends AnyFlowRegistry>(registry: R): FlowEventGroup<R> =>
  mergeEventGroups(...Object.values(registry).map((flow) => flow.events)) as FlowEventGroup<R>

type ArgsFor<U> = TrackArgsOf<PropsOf<Registry, U>>

type SubmittedUses<T extends FlowTypes> = ExtraOf<T["extras"], "submitted">

export type FlowReporter<N extends string, T extends FlowTypes> = {
  readonly name: N
  readonly def: FlowDef<N, T>
  step(step: T["step"]): void
} & ("failed" extends T["omit"]
  ? None
  : { failed(cause: unknown, ...props: ArgsFor<ExtraOf<T["extras"], "failed">>): void }) &
  ("submitted" extends T["omit"]
    ? None
    : T["settlement"] extends "transaction"
      ? {
          submitted(
            props: PropsOf<Registry, SubmittedUses<T>> & { readonly transactionId: string }
          ): void
        }
      : { submitted(...props: ArgsFor<SubmittedUses<T>>): void }) &
  (T["settlement"] extends "transaction"
    ? None
    : { completed(...props: ArgsFor<ExtraOf<T["extras"], "completed">>): void })

type AttributeValues<T extends FlowTypes> = PropsOf<Registry, T["attributes"]>
type StartedValues<T extends FlowTypes> = PropsOf<Registry, ExtraOf<T["extras"], "started">>

export type Binding<T extends FlowTypes> = {
  readonly active?: boolean
  readonly step?: T["step"] | null
} & ([T["entry"]] extends [never] ? { readonly entry?: never } : { readonly entry: T["entry"] }) &
  ([keyof AttributeValues<T>] extends [never]
    ? { readonly attributes?: never }
    : { readonly attributes: AttributeValues<T> }) &
  ([keyof StartedValues<T>] extends [never]
    ? { readonly started?: never }
    : { readonly started: StartedValues<T> })
