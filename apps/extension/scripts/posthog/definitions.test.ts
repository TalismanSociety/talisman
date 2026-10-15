import { catalogueDefinitions } from "@common/analytics/catalogue"
import { flowList } from "@common/analytics/flow/registry"
import { describe, expect, it } from "vitest"

import { type CatalogueSnapshot, catalogueSnapshot, EXCEPTION_PROPERTIES } from "./dashboards"
import {
  definitionChanges,
  eventDefinitionSpecs,
  eventsToSeed,
  propertyDefinitionSpecs,
  seedBatch,
} from "./definitions"
import { MANAGED_TAG } from "./reconcile"

const catalogue: CatalogueSnapshot = catalogueSnapshot(catalogueDefinitions(), flowList())
const typeOf = { String: "string", Numeric: "number", Boolean: "boolean" } as const

describe("seedBatch", () => {
  const events = eventsToSeed(catalogue, new Set(), new Set())
  let n = 0
  const batch = seedBatch(catalogue, events, {
    distinctId: "seed-id",
    newUuid: () => `uuid-${n++}`,
    now: new Date(0),
  })
  const propertyType = new Map(catalogue.properties.map((p) => [p.name, typeOf[p.posthogType]]))

  const sent = new Set(batch.flatMap((e) => Object.keys(e.properties)))

  it("sends every event and property definition a value of its PostHog type", () => {
    expect(batch.map((e) => e.event)).toEqual(events.map((e) => e.name))
    for (const { name } of catalogue.properties)
      if (!EXCEPTION_PROPERTIES.some((p) => p.name === name)) expect(sent).toContain(name)
    for (const event of batch)
      for (const [name, value] of Object.entries(event.properties))
        if (propertyType.has(name) && name !== "appVariant")
          expect([name, typeof value]).toEqual([name, propertyType.get(name)])
  })

  it("leaves $exception and its properties to real traffic", () => {
    expect(batch.map((e) => e.event)).not.toContain("$exception")
    for (const { name } of EXCEPTION_PROPERTIES) expect(sent).not.toContain(name)
  })

  it("marks every seed as development traffic without a person profile", () => {
    for (const event of batch) {
      expect(event.properties.appVariant).toBe("development")
      expect(event.properties.$process_person_profile).toBe(false)
      expect(event.distinct_id).toBe("seed-id")
    }
    expect(new Set(batch.map((e) => e.uuid)).size).toBe(batch.length)
  })
})

describe("eventsToSeed", () => {
  const withException: CatalogueSnapshot = {
    events: [
      { name: "a", kind: "usage", description: "", properties: ["x"] },
      { name: "b", kind: "usage", description: "", properties: [] },
      { name: "$exception", kind: "error", description: "", properties: [] },
    ],
    properties: [
      { name: "x", description: "", posthogType: "String", isSuper: false },
      { name: "appVariant", description: "", posthogType: "String", isSuper: true },
    ],
    flows: [],
  }

  it("never seeds an exception", () => {
    expect(eventsToSeed(withException, new Set(), new Set()).map((e) => e.name)).toEqual(["a", "b"])
  })

  it("seeds only events whose definition or property definitions are missing", () => {
    expect(
      eventsToSeed(withException, new Set(["a"]), new Set(["appVariant"])).map((e) => e.name)
    ).toEqual(["a", "b"])
    expect(
      eventsToSeed(withException, new Set(["a", "b"]), new Set(["x"])).map((e) => e.name)
    ).toEqual(["a"])
    expect(eventsToSeed(withException, new Set(["a", "b"]), new Set(["x", "appVariant"]))).toEqual(
      []
    )
  })
})

describe("definitionChanges", () => {
  const [property] = propertyDefinitionSpecs(catalogue)
  const matching = {
    id: "1",
    name: property.name,
    description: property.description,
    verified: true,
    tags: ["hand-made", ...property.tags],
    property_type: property.propertyType,
  }

  it("is empty once a definition matches, keeping tags added by hand", () => {
    expect(definitionChanges(property, matching)).toEqual({})
  })

  it("brings back the description, verification, managed tag and type", () => {
    expect(
      definitionChanges(property, {
        id: "1",
        name: property.name,
        description: "old",
        tags: ["hand-made"],
        property_type: null,
      })
    ).toEqual({
      description: property.description,
      verified: true,
      tags: ["hand-made", ...property.tags],
      property_type: property.propertyType,
    })
  })

  it("tags every flow event with its flow", () => {
    for (const flow of catalogue.flows)
      for (const event of Object.values(flow.eventNames))
        expect(eventDefinitionSpecs(catalogue).find((d) => d.name === event)?.tags).toEqual([
          MANAGED_TAG,
          "flow",
          `flow:${flow.name}`,
        ])
  })
})
