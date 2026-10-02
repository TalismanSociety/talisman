import { consentEvents } from "./events/consent"
import { properties } from "./properties"
import {
  type ConsentKind,
  type EventProperties,
  mergeEventGroups,
  type PosthogPropertyType,
  type TrackFn,
} from "./schema"
import { superPropertyDefinitions } from "./superProperties"

export const catalogue = mergeEventGroups(consentEvents)

export type Catalogue = typeof catalogue
export type EventName = keyof Catalogue & string

export type Track = TrackFn<Catalogue>

export type TrackRequest = {
  event: EventName
  properties: EventProperties
}

export type EventDefinition = {
  name: string
  kind: ConsentKind
  description: string
  properties: readonly string[]
}

export type PropertyDefinition = {
  name: string
  description: string
  posthogType: PosthogPropertyType
  values?: readonly string[]
  isSuper: boolean
}

export const catalogueDefinitions = (): {
  events: EventDefinition[]
  properties: PropertyDefinition[]
} => ({
  events: Object.entries(catalogue).map(([name, { kind, description, properties }]) => ({
    name,
    kind,
    description,
    properties,
  })),
  properties: [
    ...Object.entries(superPropertyDefinitions).map(([name, def]) => ({
      name,
      ...def,
      isSuper: true,
    })),
    ...Object.entries(properties).map(([name, { description, posthogType, values }]) => ({
      name,
      description,
      posthogType,
      values,
      isSuper: false,
    })),
  ],
})
