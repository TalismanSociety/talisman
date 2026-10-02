import type { track as backgroundTrack } from "@core/domains/analytics/track"
import type { track as uiTrack } from "@ui/api/track"
import { describe, expect, it } from "vitest"
import { z } from "zod/v4"

import { catalogue, catalogueDefinitions } from "./catalogue"
import { properties } from "./properties"
import {
  defineEventGroup,
  mergeEventGroups,
  type NoDuplicateEvents,
  p,
  type Registry,
  type TrackFn,
} from "./schema"
import { superPropertyDefinitions } from "./superProperties"

const RESERVED = ["$session_id", "$process_person_profile"]

describe("the catalogue", () => {
  it("describes every event and property", () => {
    const { events, properties: definitions } = catalogueDefinitions()

    expect(events.map((event) => event.name)).toEqual(Object.keys(catalogue))
    for (const definition of [...events, ...definitions])
      expect(definition.description.trim(), definition.name).not.toBe("")
  })

  it("names no property after a super property or a reserved PostHog property", () => {
    const taken = [...Object.keys(superPropertyDefinitions), ...RESERVED]

    expect(Object.keys(properties).filter((name) => taken.includes(name))).toEqual([])
  })

  it("narrows an enum property only to registered values", () => {
    for (const [event, def] of Object.entries(catalogue)) {
      const { shape } = def.schema as unknown as z.ZodObject
      for (const name of def.properties) {
        const registered = (properties as Registry)[name].values
        const schema = shape[name] instanceof z.ZodOptional ? shape[name].unwrap() : shape[name]
        if (registered && schema instanceof z.ZodEnum)
          for (const value of schema.options)
            expect(registered, `${event}.${name}`).toContain(value)
      }
    }
  })
})

describe("mergeEventGroups", () => {
  it("rejects a duplicate event name", () => {
    const group = defineEventGroup(properties, { twice: { description: "Twice.", props: {} } })

    expect(() => mergeEventGroups(group, group)).toThrow('Duplicate analytics event "twice"')
  })

  it("fails typecheck on an event name two groups define", () => {
    const once = defineEventGroup(properties, { twice: { description: "Twice.", props: {} } })
    const other = defineEventGroup(properties, { other: { description: "Other.", props: {} } })
    const distinct: NoDuplicateEvents<[typeof once, typeof other]> = true
    // @ts-expect-error twice is in two groups
    const clash: NoDuplicateEvents<[typeof once, typeof other, typeof once]> = true

    expect([distinct, clash]).toEqual([true, true])
  })
})

describe("defineEventGroup", () => {
  const group = defineEventGroup(properties, {
    narrowed: {
      description: "Narrowed.",
      props: { source: { narrow: z.enum(["settings"]), optional: true } },
    },
  })

  it("builds a strict schema from the event's uses", () => {
    const { schema, kind, properties: names } = group.narrowed

    expect(kind).toBe("usage")
    expect(names).toEqual(["source"])
    expect(schema.safeParse({}).success).toBe(true)
    expect(schema.safeParse({ source: "settings" }).success).toBe(true)
    expect(schema.safeParse({ source: "onboarding" }).success).toBe(false)
    expect(schema.safeParse({ source: "settings", extra: 1 }).success).toBe(false)
  })
})

describe("property builders", () => {
  const accepts = (def: { schema: z.ZodType }, value: unknown) =>
    def.schema.safeParse(value).success

  it.each([
    ["enum", p.enum(["a", "b"], "."), "a", "c"],
    ["count", p.count("."), 3, 1.5],
    ["count", p.count("."), 0, -1],
    ["durationMs", p.durationMs("."), 1200, 8 * 24 * 60 * 60_000],
    ["number", p.number(".", { min: 0, max: 100 }), 0.5, 100.5],
    ["bool", p.bool("."), false, "false"],
    ["slug", p.slug("."), "polkadot-asset-hub", "two words"],
    ["slug", p.slug("."), "eth_signTypedData_v4", "-leading-dash"],
    ["symbol", p.symbol("."), "USDC.e", "not a symbol"],
    ["routePattern", p.routePattern("."), "/portfolio/tokens/:symbol", "/portfolio?tab=nfts"],
    ["routePattern", p.routePattern("."), "/", "portfolio"],
    ["list", p.list(p.slug("."), ".", { maxItems: 2 }), ["a", "b"], ["a", "b", "c"]],
    ["nullable", p.nullable(p.count(".")), null, undefined],
    ["pair", p.pair(p.enum(["<10"], "."), p.slug("."), "."), "<10|usd-coin", "<10|two words"],
    ["pair", p.pair(p.enum(["<10"], "."), p.slug("."), "."), "<10|usd-coin", "<10"],
    ["pair", p.pair(p.enum(["<10"], "."), p.slug("."), "."), "<10|usd-coin", "10|usd-coin"],
  ])("%s accepts %o and rejects %o", (_, def, valid, invalid) => {
    expect(accepts(def, valid)).toBe(true)
    expect(accepts(def, invalid)).toBe(false)
  })

  it("has no builder for free text", () => {
    expect(Object.keys(p).sort()).toEqual(
      [
        "bool",
        "count",
        "durationMs",
        "enum",
        "int",
        "list",
        "nullable",
        "number",
        "pair",
        "routePattern",
        "slug",
        "symbol",
      ].sort()
    )
  })
})

const fixture = defineEventGroup(properties, {
  no_props: { description: "No props.", props: {} },
  all_optional: { description: "All optional.", props: { source: "optional" } },
})

const callShapes = (
  track: typeof uiTrack | typeof backgroundTrack,
  trackFixture: TrackFn<typeof fixture>
) => {
  track("analytics_opt_in", { source: "settings" })
  // @ts-expect-error a value outside the enum
  track("analytics_opt_in", { source: "dapp" })
  // @ts-expect-error a required property is missing
  track("analytics_opt_in", {})
  // @ts-expect-error an event with a required property needs props
  track("analytics_opt_in")
  // @ts-expect-error an uncatalogued property
  track("analytics_opt_in", { source: "settings", address: "5Grw" })
  // @ts-expect-error an unknown event
  track("nope")

  trackFixture("no_props")
  // @ts-expect-error an event with no properties takes none
  trackFixture("no_props", { source: "settings" })
  trackFixture("all_optional")
  trackFixture("all_optional", { source: "onboarding" })
}

describe("track()", () => {
  it("rejects bad call shapes at compile time: `pnpm typecheck` checks the @ts-expect-error lines", () => {
    expect(callShapes).toBeTypeOf("function")
  })
})
