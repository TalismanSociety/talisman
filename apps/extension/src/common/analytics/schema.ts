import { z } from "zod/v4"

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

type PropertyValueOf<D> = D extends PropertyDef<infer V> ? V : never

const SLUG = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/
const SYMBOL = /^[\p{L}\p{N}._\-+$]{1,24}$/u
const HOSTNAME =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/
const ROUTE_PATTERN = /^(?:\/|(?:\/(?:[A-Za-z0-9_-]+|:[A-Za-z][A-Za-z0-9]*|\*))+)$/

const MAX_COUNT = 1_000_000
const MAX_DURATION_MS = 7 * 24 * 60 * 60_000

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

  routePattern: (description: string) =>
    string(z.string().max(128).regex(ROUTE_PATTERN), description),

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
}

export type PropertyUse<V extends PropertyValue = PropertyValue> =
  | "required"
  | "optional"
  | { readonly narrow: z.ZodType<V>; readonly optional?: true }

type Registry = Readonly<Record<string, PropertyDef>>

type IsOptionalUse<U> = U extends "optional" ? true : U extends { optional: true } ? true : false

type UseValue<D, U> = U extends { narrow: z.ZodType<infer V> } ? V : PropertyValueOf<D>

type Simplify<T> = { [K in keyof T]: T[K] } & {}

type PropsOf<R extends Registry, Uses> = Simplify<
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
  readonly properties: readonly string[]
  readonly schema: z.ZodType<Props>
}

export type PropsOfEvent<D> = D extends EventDef<infer Props> ? Props : never

export type EventGroup = Readonly<Record<string, EventDef>>

type EventInput<R extends Registry> = {
  readonly description: string
  readonly kind?: ConsentKind
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
    Object.entries(group).map(([name, { description, kind = "usage", props }]) => {
      const uses = Object.entries(props) as [string, PropertyUse][]
      const shape = Object.fromEntries(
        uses.map(([property, use]) => [property, schemaOfUse(registry[property], use)])
      )
      const def: EventDef = {
        description,
        kind,
        properties: uses.map(([property]) => property),
        schema: z.strictObject(shape) as z.ZodType as z.ZodType<EventProperties>,
      }
      return [name, def]
    })
  ) as { readonly [E in keyof G]: EventDef<PropsOf<R, G[E]["props"]>> }

type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (
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
      if (Object.hasOwn(merged, name)) throw new Error(`Duplicate analytics event "${name}"`)
      merged[name] = def
    }
  return merged as UnionToIntersection<Gs[number]>
}

export type TrackArgsOf<Props> = [keyof Props] extends [never]
  ? []
  : Record<string, never> extends Props
    ? [props?: Props]
    : [props: Props]

export type TrackFn<G extends EventGroup> = <E extends keyof G & string>(
  event: E,
  ...args: TrackArgsOf<PropsOfEvent<G[E]>>
) => void
