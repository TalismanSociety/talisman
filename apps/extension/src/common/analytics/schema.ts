import { z } from "zod/v4"

import { isRoutePattern } from "./screenPattern"

export type PropertyScalar = string | number | boolean | null
export type PropertyValue = PropertyScalar | readonly PropertyScalar[]

export type PosthogPropertyType = "String" | "Numeric" | "Boolean"

export const CONSENT_KINDS = ["usage", "error"] as const
export type ConsentKind = (typeof CONSENT_KINDS)[number]

export type PropertyDef<V extends PropertyValue = PropertyValue> = {
  readonly schema: z.ZodType<V>
  readonly description: string
  readonly posthogType: PosthogPropertyType
  readonly values?: readonly string[]
}

export type PropertyValueOf<D> = D extends PropertyDef<infer V> ? V : never

const SLUG = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/
const SYMBOL = /^[\p{L}\p{N}._\-+$]{1,24}$/u
const HOSTNAME =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/

export const isHostname = (value: string): boolean => HOSTNAME.test(value)

export const symbolForAnalytics = (symbol: string | null | undefined): string =>
  symbol && SYMBOL.test(symbol) ? symbol : "unknown"

const MAX_COUNT = 1_000_000
const MAX_DURATION_MS = 7 * 24 * 60 * 60_000

export const toDurationMs = (ms: number): number =>
  Number.isNaN(ms) ? 0 : Math.min(MAX_DURATION_MS, Math.max(0, Math.round(ms)))

const int = (description: string, { min, max }: { min?: number; max?: number } = {}) => {
  let schema = z.number().int()
  if (min !== undefined) schema = schema.min(min)
  if (max !== undefined) schema = schema.max(max)
  return { schema, description, posthogType: "Numeric" } satisfies PropertyDef<number>
}

const string = (schema: z.ZodType<string>, description: string): PropertyDef<string> => ({
  schema,
  description,
  posthogType: "String",
})

export const p = {
  enum: <const V extends readonly [string, ...string[]]>(
    values: V,
    description: string
  ): PropertyDef<V[number]> => ({
    schema: z.enum(values),
    description,
    posthogType: "String",
    values,
  }),

  int,

  count: (description: string) => int(description, { min: 0, max: MAX_COUNT }),

  number: (description: string, { min, max }: { min: number; max: number }) =>
    ({
      schema: z.number().min(min).max(max),
      description,
      posthogType: "Numeric",
    }) satisfies PropertyDef<number>,

  durationMs: (description: string) => int(description, { min: 0, max: MAX_DURATION_MS }),

  bool: (description: string): PropertyDef<boolean> => ({
    schema: z.boolean(),
    description,
    posthogType: "Boolean",
  }),

  slug: (description: string, { maxLength = 64 }: { maxLength?: number } = {}) =>
    string(z.string().max(maxLength).regex(SLUG), description),

  symbol: (description: string) => string(z.string().regex(SYMBOL), description),

  hostname: (description: string) => string(z.string().regex(HOSTNAME), description),

  routePattern: (description: string) => string(z.string().refine(isRoutePattern), description),

  /** PostHog stores arrays as JSON strings. */
  list: <V extends PropertyScalar>(
    item: PropertyDef<V>,
    description: string,
    { maxItems = 100 }: { maxItems?: number } = {}
  ): PropertyDef<readonly V[]> => ({
    schema: z.array(item.schema).max(maxItems),
    description,
    posthogType: "String",
  }),

  nullable: <V extends PropertyScalar>(def: PropertyDef<V>): PropertyDef<V | null> => ({
    ...def,
    schema: def.schema.nullable(),
  }),

  pair: <L extends string, R extends string>(
    left: PropertyDef<L>,
    right: PropertyDef<R>,
    description: string
  ): PropertyDef<`${L}|${R}`> =>
    string(
      z.string().refine((value) => {
        const separator = value.indexOf("|")
        return (
          separator !== -1 &&
          left.schema.safeParse(value.slice(0, separator)).success &&
          right.schema.safeParse(value.slice(separator + 1)).success
        )
      }),
      description
    ) as PropertyDef<`${L}|${R}`>,
}

export type PropertyUse<V extends PropertyValue = PropertyValue> =
  | "required"
  | "optional"
  | { readonly narrow: z.ZodType<V>; readonly optional?: true }

export type Registry = Readonly<Record<string, PropertyDef>>

type IsOptionalUse<U> = U extends "optional" ? true : U extends { optional: true } ? true : false

type UseValue<D, U> = U extends { narrow: z.ZodType<infer V> } ? V : PropertyValueOf<D>

type Simplify<T> = { [K in keyof T]: T[K] } & {}

export type PropsOf<R extends Registry, Uses> = Simplify<
  {
    [K in keyof Uses & keyof R as IsOptionalUse<Uses[K]> extends true ? never : K]: UseValue<
      R[K],
      Uses[K]
    >
  } & {
    [K in keyof Uses & keyof R as IsOptionalUse<Uses[K]> extends true ? K : never]?: UseValue<
      R[K],
      Uses[K]
    >
  }
>

export type EventProperties = Readonly<Record<string, PropertyValue | undefined>>

export type EventDef<Props extends EventProperties = EventProperties> = {
  readonly description: string
  readonly kind: ConsentKind
  readonly unlinked?: true
  readonly properties: readonly string[]
  readonly schema: z.ZodType<Props>
}

export type PropsOfEvent<D> = D extends EventDef<infer Props> ? Props : never

export type EventGroup = Readonly<Record<string, EventDef>>

type EventInput<R extends Registry> = {
  readonly description: string
  readonly kind?: ConsentKind
  /** Sent under an id of its own, outside any session: nothing ties it to the user's other events. */
  readonly unlinked?: true
  readonly props: { readonly [K in keyof R]?: PropertyUse<PropertyValueOf<R[K]>> }
}

const schemaOfUse = (def: PropertyDef, use: PropertyUse): z.ZodType => {
  if (use === "required") return def.schema
  if (use === "optional") return def.schema.optional()
  return use.optional ? use.narrow.optional() : use.narrow
}

export const defineEventGroup = <
  const R extends Registry,
  const G extends Readonly<Record<string, EventInput<R>>>,
>(
  registry: R,
  group: G
): { readonly [E in keyof G]: EventDef<PropsOf<R, G[E]["props"]>> } =>
  Object.fromEntries(
    Object.entries(group).map(([name, { description, kind = "usage", unlinked, props }]) => {
      const uses = Object.entries(props) as [string, PropertyUse][]
      const shape = Object.fromEntries(
        uses.map(([property, use]) => [property, schemaOfUse(registry[property], use)])
      )
      const def: EventDef = {
        description,
        kind,
        ...(unlinked && { unlinked }),
        properties: uses.map(([property]) => property),
        schema: z.strictObject(shape) as z.ZodType as z.ZodType<EventProperties>,
      }
      return [name, def]
    })
  ) as { readonly [E in keyof G]: EventDef<PropsOf<R, G[E]["props"]>> }

export type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (
  i: infer I
) => void
  ? I
  : never

export const mergeEventGroups = <const Gs extends readonly EventGroup[]>(
  ...groups: Gs
): UnionToIntersection<Gs[number]> => {
  const merged: Record<string, EventDef> = {}
  for (const group of groups)
    for (const [name, def] of Object.entries(group)) {
      if (Object.hasOwn(merged, name))
        throw new Error(
          `Duplicate analytics event "${name}". A flow generates <flow>_started, _step_viewed, _submitted, _completed, _failed and _abandoned: rename the domain event, or give the flow another name or a rename entry.`
        )
      merged[name] = def
    }
  return merged as UnionToIntersection<Gs[number]>
}

type DuplicateNames<Gs extends readonly EventGroup[], Seen = never> = Gs extends readonly [
  infer Head extends EventGroup,
  ...infer Tail extends EventGroup[],
]
  ? (keyof Head & Seen) | DuplicateNames<Tail, Seen | keyof Head>
  : never

export type NoDuplicateEvents<Gs extends readonly EventGroup[]> = [DuplicateNames<Gs>] extends [
  never,
]
  ? true
  : `Duplicate analytics event: ${DuplicateNames<Gs> & string}`

export type TrackArgsOf<Props> = [keyof Props] extends [never]
  ? []
  : Record<string, never> extends Props
    ? [props?: Props]
    : [props: Props]

export type TrackFn<G extends EventGroup> = <E extends keyof G & string>(
  event: E,
  ...args: TrackArgsOf<PropsOfEvent<G[E]>>
) => void
