import type { NetworkId } from "@talismn/chaindata-provider"

import type { Address } from "../../types/base"

/**
 * One row in a delegator's `Proxy.Proxies` storage entry.
 *
 * `delay` is the number of blocks the delegate must wait between announcing an
 * action and being able to dispatch it. When non-zero the proxy requires the
 * announcement workflow which Talisman doesn't currently support — the UI
 * surfaces a warning in that case.
 */
export type AccountProxyEntry = {
  delegate: Address
  proxyType: string
  delay: string // bigint serialised as decimal string for transport / persistence
}

/**
 * The full `Proxy.Proxies(delegator)` storage value plus metadata.
 *
 * Note: `deposit` is per delegator-per-network, NOT per row. Callers must never
 * sum `deposit` across rows or sets.
 *
 * `isStale` is set to true when the most recent poll for this tuple failed; the
 * data shown is whatever the last successful poll returned.
 */
export type AccountProxySet = {
  delegator: Address
  networkId: NetworkId
  /**
   * Number of proxy entries, available without metadata (decoded from
   * the SCALE compact prefix of the raw storage value).
   */
  proxyCount: number
  deposit: string // bigint serialised as decimal string
  isStale: boolean
  /**
   * May be empty when only the lightweight poll has run. Populated on-demand
   * when the user opens a proxy management form (requires metadata download).
   */
  proxies: AccountProxyEntry[]
}

export type AccountProxiesSnapshot = {
  /** Keyed by `${networkId}|${delegator}` for atomic per-tuple replacement. */
  sets: Record<string, AccountProxySet>
}

export type AccountProxiesSubscriptionStatus = "initialising" | "live"

export type AccountProxiesSubscriptionResponse = {
  status: AccountProxiesSubscriptionStatus
  proxySets: AccountProxySet[]
}

export type RequestAccountProxiesRefresh = {
  networkId: NetworkId
  address: Address
}

export type RequestAccountProxiesLoadDetails = {
  networkId: NetworkId
  address: Address
}

export interface AccountProxiesMessages {
  "pri(accountProxies.subscribe)": [null, boolean, AccountProxiesSubscriptionResponse]
  "pri(accountProxies.refresh)": [RequestAccountProxiesRefresh, boolean]
  "pri(accountProxies.loadDetails)": [RequestAccountProxiesLoadDetails, boolean]
}
