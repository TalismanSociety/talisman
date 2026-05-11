import { log } from "@common/log"
import { isAccountOwned } from "@talismn/keyring"
import { keepAlive } from "@talismn/util"
import { isEqual } from "lodash-es"
import PQueue from "p-queue"
import {
  combineLatest,
  defer,
  distinctUntilChanged,
  firstValueFrom,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
} from "rxjs"

import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithNetwork } from "../accounts/helpers"
import { activeNetworksStore, isNetworkActive } from "../balances/store.activeNetworks"
import { keyringStore } from "../keyring/store"
import {
  addressToAccountId,
  loadNetworkProxyDetails,
  type ProxyPollCandidate,
  pollNetworkProxiesLightweight,
} from "./accountProxiesProvider"
import { createPollingTrigger$ } from "./polling"
import {
  accountProxiesStore$,
  markAccountProxySetsStale,
  mergeLightweightPollResults,
  storeHydrated$,
  upsertAccountProxySets,
} from "./store.accountProxies"
import { getProxyPalletStatus } from "./store.proxyPalletCache"
import type { AccountProxiesSubscriptionResponse } from "./types"

const POLL_INTERVAL_MS = 5 * 60 * 1000
const NETWORK_CONCURRENCY = 6

/**
 * Build the candidate map: for each active substrate network, the list of owned
 * accounts compatible with that network.
 *
 * Networks where the proxy pallet cache says `false` for the current
 * specVersion are excluded — no metadata download or RPC probe needed.
 */
const candidates$: Observable<ProxyPollCandidate[]> = combineLatest({
  networks: chaindataProvider.getNetworks$("polkadot"),
  accounts: keyringStore.accounts$,
  activeNetworks: activeNetworksStore.observable,
}).pipe(
  switchMap(({ networks, accounts, activeNetworks }) => {
    const ownedAccounts = accounts.filter(isAccountOwned)
    const activeDotNetworks = networks.filter((n) => isNetworkActive(n, activeNetworks))
    if (!ownedAccounts.length || !activeDotNetworks.length) {
      return of<ProxyPollCandidate[]>([])
    }

    const candidates: ProxyPollCandidate[] = []
    for (const network of activeDotNetworks) {
      // `true` = confirmed via non-null storage or metadata inspection.
      // `false` = definitively ruled out via metadata (pallet absent).
      // `undefined` = unknown, must probe.
      const cachedStatus = getProxyPalletStatus(
        network.id,
        typeof network.specVersion === "number" ? network.specVersion : undefined
      )
      if (cachedStatus === false) continue

      const compatibleAccounts = ownedAccounts.filter((a) =>
        isAccountCompatibleWithNetwork(network, a)
      )
      if (!compatibleAccounts.length) continue

      const delegators = compatibleAccounts
        .filter((a) => addressToAccountId(a.address, network.account) !== null)
        .map((a) => ({ address: a.address }))
      if (!delegators.length) continue

      candidates.push({ network, delegators })
    }

    return of(candidates)
  }),
  distinctUntilChanged<ProxyPollCandidate[]>((a, b) => {
    if (a.length !== b.length) return false
    const summarise = (cs: ProxyPollCandidate[]) =>
      cs
        .map(
          (c) =>
            `${c.network.id}::${c.delegators
              .map((d) => d.address)
              .sort()
              .join(",")}`
        )
        .sort()
    return isEqual(summarise(a), summarise(b))
  })
)

/**
 * Lightweight poll cycle: uses raw storage keys (no metadata download).
 * Counts are merged into the store atomically against the live snapshot, so
 * any concurrent `loadProxyDetails` writes are preserved.
 */
const runLightweightPollCycle = async (
  candidates: ProxyPollCandidate[],
  abortController: AbortController
): Promise<void> => {
  if (!candidates.length) return

  const queue = new PQueue({ concurrency: NETWORK_CONCURRENCY })

  await queue.addAll(
    candidates.map((candidate) => async () => {
      if (abortController.signal.aborted) return
      const outcome = await pollNetworkProxiesLightweight(candidate, abortController.signal)
      if (abortController.signal.aborted) return
      if (outcome.ok) {
        mergeLightweightPollResults(candidate.network.id, outcome.results, candidate.delegators)
      } else {
        log.warn(
          "[accountProxies] lightweight poll failed for network",
          candidate.network.id,
          outcome.error
        )
        markAccountProxySetsStale(
          candidate.delegators.map((d) => ({
            networkId: candidate.network.id,
            delegator: d.address,
          }))
        )
      }
    })
  )
}

/**
 * Inner observable: while subscribed, polls every 5 minutes.
 * Tears down on unsubscribe.
 */
const pollingDriver$ = new Observable<"live">((subscriber) => {
  const abortController = new AbortController()
  let initialResolved = false
  let pollSub: { unsubscribe: () => void } | null = null
  // Per-cycle abort controller to cancel in-progress cycles when new candidates arrive
  let cycleAbortController: AbortController | null = null

  // Wait for the store to hydrate from disk before starting poll cycles.
  // This prevents the first lightweight poll from running against an empty
  // snapshot and wiping persisted proxy details.
  firstValueFrom(storeHydrated$).then(() => {
    if (abortController.signal.aborted) return

    pollSub = createPollingTrigger$(candidates$, POLL_INTERVAL_MS, () => {}).subscribe(
      (candidates) => {
        // Abort any in-progress cycle to prevent stale writes
        cycleAbortController?.abort()
        cycleAbortController = new AbortController()
        const currentCycleAbort = cycleAbortController

        // Link to parent: if the parent aborts, also abort this cycle
        const onParentAbort = () => currentCycleAbort.abort()
        abortController.signal.addEventListener("abort", onParentAbort)

        runLightweightPollCycle(candidates, currentCycleAbort)
          .catch((err) => {
            if (!currentCycleAbort.signal.aborted)
              log.error("[accountProxies] poll cycle failed", err)
          })
          .finally(() => {
            abortController.signal.removeEventListener("abort", onParentAbort)
            if (!initialResolved) {
              initialResolved = true
              subscriber.next("live")
            }
          })
      }
    )
  })

  return () => {
    abortController.abort()
    cycleAbortController?.abort()
    pollSub?.unsubscribe()
  }
})

/**
 * Public observable consumed by the frontend via `pri(accountProxies.subscribe)`.
 *
 * - Emits `status: "initialising"` straight away with the cached snapshot so
 *   the UI can render immediately on cold start.
 * - Switches to `status: "live"` after the first poll cycle completes.
 * - Pipes every snapshot mutation through to subscribers without re-polling.
 *
 * Polling shuts down on UI unsubscribe via `shareReplay({ refCount: true })`.
 */
export const accountProxies$ = defer(() => {
  let status: "initialising" | "live" = "initialising"

  return combineLatest({
    snapshot: accountProxiesStore$,
    driverEvent: pollingDriver$.pipe(startWith<"initialising" | "live">("initialising")),
  }).pipe(
    map(({ snapshot, driverEvent }): AccountProxiesSubscriptionResponse => {
      if (driverEvent === "live") status = "live"
      return {
        status,
        proxySets: Object.values(snapshot.sets),
      }
    }),
    distinctUntilChanged((a, b) => isEqual(a, b))
  )
}).pipe(shareReplay({ bufferSize: 1, refCount: true }), keepAlive(3000))

/**
 * Load full proxy details for a specific (network, delegator) tuple.
 * Downloads metadata for ONE chain and decodes the full proxy entries.
 *
 * Called on-demand from `pri(accountProxies.loadDetails)` when the user
 * opens a proxy management form.
 */
export const loadProxyDetails = async (
  networkId: string,
  address: string,
  signal?: AbortSignal
): Promise<boolean> => {
  try {
    const networks = await chaindataProvider.getNetworks("polkadot")
    const network = networks.find((n) => n.id === networkId)
    if (!network) {
      log.warn("[accountProxies] loadProxyDetails: network not found", networkId)
      return false
    }

    const candidate: ProxyPollCandidate = {
      network,
      delegators: [{ address }],
    }

    const outcome = await loadNetworkProxyDetails(candidate, signal ?? AbortSignal.timeout(15_000))
    if (outcome.ok) {
      upsertAccountProxySets(outcome.sets)
      return true
    }
    log.warn("[accountProxies] loadProxyDetails failed", networkId, outcome.error)
    return false
  } catch (err) {
    log.error("[accountProxies] loadProxyDetails error", err)
    return false
  }
}
