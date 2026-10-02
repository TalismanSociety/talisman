import type { EventDefinition, PropertyDefinition } from "@common/analytics/catalogue"

import type { CatalogueSnapshot } from "./dashboards"
import { changedFields, MANAGED_TAG, withTags } from "./reconcile"

export type DefinitionSpec = {
  readonly name: string
  readonly description: string
  readonly tags: readonly string[]
  readonly propertyType?: PropertyDefinition["posthogType"]
}

export type StoredDefinition = {
  readonly id: string
  readonly name: string
  readonly description?: string | null
  readonly verified?: boolean
  readonly tags?: readonly string[] | null
  readonly property_type?: string | null
}

export const eventDefinitionSpecs = (catalogue: CatalogueSnapshot): DefinitionSpec[] => {
  const flowOf = new Map(
    catalogue.flows.flatMap((flow) =>
      Object.values(flow.eventNames).map((event) => [event as string, flow.name])
    )
  )
  return catalogue.events.map(({ name, description }) => {
    const flow = flowOf.get(name)
    return { name, description, tags: [MANAGED_TAG, ...(flow ? ["flow", `flow:${flow}`] : [])] }
  })
}

export const propertyDefinitionSpecs = (catalogue: CatalogueSnapshot): DefinitionSpec[] =>
  catalogue.properties.map(({ name, description, posthogType, isSuper }) => ({
    name,
    description,
    propertyType: posthogType,
    tags: [MANAGED_TAG, ...(isSuper ? ["super"] : [])],
  }))

export const definitionChanges = (spec: DefinitionSpec, stored: StoredDefinition) =>
  changedFields(
    {
      description: stored.description ?? "",
      verified: stored.verified ?? false,
      tags: stored.tags ?? [],
      ...(spec.propertyType && { property_type: stored.property_type ?? null }),
    },
    {
      description: spec.description,
      verified: true,
      tags: withTags(stored.tags, spec.tags),
      ...(spec.propertyType && { property_type: spec.propertyType }),
    }
  )

/**
 * A seeded exception would open an Error tracking issue, which the test-account filter does not
 * hide, so error-kind definitions come from real traffic.
 */
export const isSeedable = (event: EventDefinition) => event.kind !== "error"

/** When only a super property is missing, the first seedable event carries it. */
export const eventsToSeed = (
  catalogue: CatalogueSnapshot,
  storedEvents: ReadonlySet<string>,
  storedProperties: ReadonlySet<string>
): EventDefinition[] => {
  const seedable = catalogue.events.filter(isSeedable)
  const missing = seedable.filter(
    (event) =>
      !storedEvents.has(event.name) || event.properties.some((name) => !storedProperties.has(name))
  )
  const superMissing = catalogue.properties.some((p) => p.isSuper && !storedProperties.has(p.name))
  return missing.length || !superMissing ? missing : seedable.slice(0, 1)
}

/** A value of the property's PostHog type, so the type PostHog infers matches the definition. */
export const seedValue = (property: PropertyDefinition): string | number | boolean => {
  if (property.posthogType === "Numeric") return 0
  if (property.posthogType === "Boolean") return false
  return property.values?.[0] ?? "seed"
}

export type SeedEvent = {
  readonly event: string
  readonly distinct_id: string
  readonly uuid: string
  readonly timestamp: string
  readonly properties: Readonly<Record<string, string | number | boolean>>
}

/** Development variant, so the test-account filter hides them. */
export const seedBatch = (
  catalogue: CatalogueSnapshot,
  events: readonly EventDefinition[],
  { distinctId, newUuid, now }: { distinctId: string; newUuid: () => string; now: Date }
): SeedEvent[] => {
  const byName = new Map(catalogue.properties.map((p) => [p.name, p]))
  const superProperties = Object.fromEntries(
    catalogue.properties.filter((p) => p.isSuper).map((p) => [p.name, seedValue(p)])
  )
  return events.map((event) => ({
    event: event.name,
    distinct_id: distinctId,
    uuid: newUuid(),
    timestamp: now.toISOString(),
    properties: {
      ...Object.fromEntries(
        event.properties.flatMap((name) => {
          const property = byName.get(name)
          return property ? [[name, seedValue(property)]] : []
        })
      ),
      ...superProperties,
      appVariant: "development",
      $process_person_profile: false,
    },
  }))
}
