import { accountEvents } from "./events/accounts"
import { consentEvents } from "./events/consent"
import { dappRequestEvents } from "./events/dappRequests"
import { dappEvents } from "./events/dapps"
import { errorEvents } from "./events/errors"
import { fundsEvents } from "./events/funds"
import { lifecycleEvents } from "./events/lifecycle"
import { networkTokenEvents } from "./events/networksTokens"
import { overlayEvents } from "./events/overlays"
import { performanceEvents } from "./events/performance"
import { portfolioEvents } from "./events/portfolio"
import { screenEvents } from "./events/screens"
import { settingsEvents } from "./events/settings"
import { stakingEvents } from "./events/staking"
import { transactionEvents } from "./events/transactions"
import { flowEventGroup } from "./flow/defineFlow"
import { FLOWS } from "./flow/registry"
import { properties } from "./properties"
import {
  type ConsentKind,
  type EventProperties,
  mergeEventGroups,
  type NoDuplicateEvents,
  type PosthogPropertyType,
  type Registry,
  type TrackFn,
} from "./schema"
import { superPropertyDefinitions } from "./superProperties"

const groups = [
  consentEvents,
  screenEvents,
  overlayEvents,
  errorEvents,
  transactionEvents,
  dappRequestEvents,
  performanceEvents,
  lifecycleEvents,
  accountEvents,
  fundsEvents,
  dappEvents,
  networkTokenEvents,
  stakingEvents,
  portfolioEvents,
  settingsEvents,
  flowEventGroup(FLOWS),
] as const

true satisfies NoDuplicateEvents<typeof groups>

export const catalogue = mergeEventGroups(...groups)

export type Catalogue = typeof catalogue
export type EventName = keyof Catalogue & string

export type Track = TrackFn<Catalogue>

export const isEventName = (name: string): name is EventName => Object.hasOwn(catalogue, name)

export type TrackRequest = {
  event: EventName
  properties: EventProperties
  screen?: string
  transactionId?: string
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
