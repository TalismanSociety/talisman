import { consentEvents } from "./events/consent"
import { dappRequestEvents } from "./events/dappRequests"
import { errorEvents } from "./events/errors"
import { lifecycleEvents } from "./events/lifecycle"
import { overlayEvents } from "./events/overlays"
import { performanceEvents } from "./events/performance"
import { screenEvents } from "./events/screens"
import { transactionEvents } from "./events/transactions"
import { properties } from "./properties"
import {
  type ConsentKind,
  type EventProperties,
  mergeEventGroups,
  type PosthogPropertyType,
  type Registry,
  type TrackFn,
} from "./schema"
import { superPropertyDefinitions } from "./superProperties"

export const catalogue = mergeEventGroups(
  consentEvents,
  screenEvents,
  overlayEvents,
  errorEvents,
  transactionEvents,
  dappRequestEvents,
  performanceEvents,
  lifecycleEvents
)

export type Catalogue = typeof catalogue
export type EventName = keyof Catalogue & string

export type Track = TrackFn<Catalogue>

export type TrackRequest = {
  event: EventName
  properties: EventProperties
  /** The page's current screen, stamped as `$screen_name`. An invalid one is dropped, never the event. */
  screen?: string
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
    ...Object.entries(properties as Registry).map(
      ([name, { description, posthogType, values }]) => ({
        name,
        description,
        posthogType,
        values,
        isSuper: false,
      })
    ),
  ],
})
