import { log } from "@common/log"
import { isAccountOwned } from "@talismn/keyring"
import { keepAlive } from "@talismn/util"
import { isEqual } from "lodash-es"
import PQueue from "p-queue"
import {
  combineLatest,
  defer,
  distinctUntilChanged,
  from,
  interval,
  map,
  Observable,
  of,
  Subject,
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
  type ProxyPollCandidate,
  pollNetworkProxies,
} from "./accountProxiesProvider"
import { hasProxyPallet } from "./hasProxyPallet"
import {
  accountProxiesStore$,
  getAccountProxySetKey,
  markAccountProxySetsStale,
  upsertAccountProxySets,
} from "./store.accountProxies"
import type {
  AccountProxiesSubscriptionResponse,
  AccountProxySet,
  RequestAccountProxiesRefresh,
} from "./types"

const POLL_INTERVAL_MS = 5 * 60 * 1000
const NETWORK_CONCURRENCY = 6

/** External refresh requests pushed by `refreshAccountProxies`. */
const refresh$ = new Subject<RequestAccountProxiesRefresh>()

/** Tuples currently in flight (debug + future race protection). */
const inFlight = new Set<string>()

/**
 * Build the candidate map: for each active substrate network with a Proxy
 * pallet, the list of owned accounts compatible with that network.
 *
 * Pallet detection is run lazily and cached in `hasProxyPallet`.
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

    return from(
      Promise.all(
        activeDotNetworks.map(async (network) => {
          const compatibleAccounts = ownedAccounts.filter((a) =>
            isAccountCompatibleWithNetwork(network, a)
          )
          if (!compatibleAccounts.length) return null

          const detection = await hasProxyPallet(network.id, network.genesisHash)
          if (!detection.hasProxyPallet) return null

          const delegators = compatibleAccounts
            .filter((a) => addressToAccountId(a.address, network.account) !== null)
            .map((a) => ({ address: a.address }))
          if (!delegators.length) return null

          return { network, delegators } as ProxyPollCandidate
        })
      ).then((items) => items.filter((c): c is ProxyPollCandidate => c !== null))
    )
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

const runPollCycle = async (
  candidates: ProxyPollCandidate[],
  abortController: AbortController,
  filter?: (c: ProxyPollCandidate) => ProxyPollCandidate | null
): Promise<void> => {
  if (!candidates.length) return

  const queue = new PQueue({ concurrency: NETWORK_CONCURRENCY })

  await queue.addAll(
    candidates
      .map((c) => (filter ? filter(c) : c))
      .filter((c): c is ProxyPollCandidate => !!c)
      .map((candidate) => async () => {
        if (abortController.signal.aborted) return
        const tupleKeys = candidate.delegators.map((d) =>
          getAccountProxySetKey(candidate.network.id, d.address)
        )
        for (const k of tupleKeys) inFlight.add(k)
        try {
          const outcome = await pollNetworkProxies(candidate, abortController.signal)
          if (abortController.signal.aborted) return
          if (outcome.ok) {
            // Persist the successful results (including empty sets, which clear stale data).
            const sets: AccountProxySet[] = outcome.sets
            // Ensure every requested delegator gets a set entry, even if the
            // response was missing (treated as empty default by decode).
            const seen = new Set(sets.map((s) => s.delegator))
            for (const d of candidate.delegators) {
              if (!seen.has(d.address)) {
                sets.push({
                  delegator: d.address,
                  networkId: candidate.network.id,
                  deposit: "0",
                  isStale: false,
                  proxies: [],
                })
              }
            }
            upsertAccountProxySets(sets)
          } else {
            log.warn(
              "[accountProxies] poll failed for network",
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
        } finally {
          for (const k of tupleKeys) inFlight.delete(k)
        }
      })
  )
}

/**
 * Inner observable: while subscribed, polls every 5 minutes, plus on demand
 * refresh requests via `refreshAccountProxies`. Tears down on unsubscribe.
 */
const pollingDriver$ = new Observable<"live">((subscriber) => {
  const abortController = new AbortController()
  let currentCandidates: ProxyPollCandidate[] = []
  let initialResolved = false

  const candidatesSub = candidates$.subscribe((cs) => {
    currentCandidates = cs
  })

  const tickSub = interval(POLL_INTERVAL_MS)
    .pipe(startWith(-1))
    .subscribe(() => {
      runPollCycle(currentCandidates, abortController)
        .catch((err) => log.error("[accountProxies] poll cycle failed", err))
        .finally(() => {
          if (!initialResolved) {
            initialResolved = true
            subscriber.next("live")
          }
        })
    })

  const refreshSub = refresh$.subscribe((req) => {
    runPollCycle(currentCandidates, abortController, (candidate) => {
      if (candidate.network.id !== req.networkId) return null
      const matching = candidate.delegators.find((d) => d.address === req.address)
      if (!matching) return null
      return { network: candidate.network, delegators: [matching] }
    }).catch((err) => log.error("[accountProxies] refresh cycle failed", err))
  })

  return () => {
    abortController.abort()
    candidatesSub.unsubscribe()
    tickSub.unsubscribe()
    refreshSub.unsubscribe()
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

/** Pushed by `pri(accountProxies.refresh)` from the wizard after a successful tx. */
export const refreshAccountProxies = (req: RequestAccountProxiesRefresh) => {
  refresh$.next(req)
}
