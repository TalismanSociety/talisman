import {
  type AnyMiniMetadata,
  type BtcNetworkId,
  type ChaindataProvider,
  type DotNetworkId,
  isNetworkDot,
  type Network,
  type NetworkId,
  parseTokenId,
  type Token,
  type TokenId,
} from "@talismn/chaindata-provider"
import {
  type AccountPlatform,
  getAccountPlatformFromAddress,
  normalizeAddress,
} from "@talismn/crypto"
import {
  getSharedObservable,
  isNotNil,
  isTruthy,
  keepAlive,
  mapWithYield,
  reportJsActivity,
  switchMapChunked,
  type TimeSlicer,
} from "@talismn/util"
import { assign, fromPairs, isEqual, keyBy, keys, toPairs, uniq, values } from "lodash-es"
import {
  auditTime,
  catchError,
  combineLatest,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
  firstValueFrom,
  from,
  map,
  type Observable,
  of,
  ReplaySubject,
  shareReplay,
  startWith,
  switchMap,
  tap,
  timer,
} from "rxjs"
import { withRetry } from "viem"

import { BALANCE_MODULES, type ChainConnectors, findDTaoConvictionLock } from "."
import { getMiniMetadatas, getSpecVersion } from "./getMiniMetadatas"
import log from "./log"
import { getDetectedTokensIds$ } from "./modules/shared/detectedTokens"
import {
  classifySmallAmountDrift,
  stabilizeModuleResults,
} from "./modules/shared/stabilizeBalances"
import {
  type Address,
  deriveMiniMetadataId,
  getBalanceId,
  getBalanceStorageFingerprint,
  getRawLocks,
  getRawTotalPlanck,
  type IBalance,
  isEqualBalancesResult,
  isEqualMiniMetadatas,
  type MiniMetadata,
} from "./types"
import type { BtcAccountsMeta, TokensWithAddresses } from "./types/IBalanceModule"

type BalancesStatus = "initialising" | "live"

/**
 * Cross-module drift tolerance (see classifySmallAmountDrift): amounts moving by no more
 * than this classify as drift and re-emit at most once per stabilizer refresh interval.
 * Kept tight — a real incoming transfer above 0.1% of the position emits immediately.
 */
const GENERIC_DRIFT_TOLERANCE_BPS = 10n

export type BalancesResult = {
  status: BalancesStatus
  balances: IBalance[]
  failedBalanceIds: string[] // balance ids that failed to fetch
}

export type BalancesStorage = {
  balances: IBalance[]
  miniMetadatas: MiniMetadata[]
}

type ProviderBalancesStorage = {
  balances: Record<string, IBalance>
  miniMetadatas: Record<string, MiniMetadata>
}

const DEFAULT_STORAGE: BalancesStorage = {
  balances: [],
  miniMetadatas: [],
}

export class BalancesProvider {
  #chaindataProvider: ChaindataProvider
  #chainConnectors: ChainConnectors
  #storage: ReplaySubject<ProviderBalancesStorage>
  #storageValue: ProviderBalancesStorage
  #storage$: Observable<BalancesStorage>
  // balance ids whose most recent module emission was live, by confirmation time. Stored
  // content always mirrors the last live emission (see updateStorage$), so on a pipeline
  // restart the seed can re-emit recently-confirmed entries with their "live" status
  // intact instead of downgrading the whole snapshot to "cache" and flipping it back
  // once modules reconnect
  #lastLiveAt = new Map<string, number>()

  constructor(
    chaindataProvider: ChaindataProvider,
    chainConnectors: ChainConnectors,
    storage: BalancesStorage = DEFAULT_STORAGE
  ) {
    this.#chaindataProvider = chaindataProvider
    this.#chainConnectors = chainConnectors
    this.#storageValue = {
      balances: keyBy(storage.balances.filter(isNotNil), (b) => getBalanceId(b)),
      miniMetadatas: keyBy(storage.miniMetadatas.filter(isNotNil), (m) => m.id),
    }
    this.#storage = new ReplaySubject<ProviderBalancesStorage>(1)
    this.#storage.next(this.#storageValue)
    // built once so the sort/projection is shared by all subscribers (a previous version
    // passed shareReplay as a 2nd argument to map, which made it inert — every subscriber
    // re-ran the sort on every emission)
    this.#storage$ = this.#storage.pipe(
      map(
        ({ balances, miniMetadatas }): BalancesStorage => ({
          balances: values(balances).filter(isNotNil).sort(sortByBalanceId),
          miniMetadatas: values(miniMetadatas).filter(isNotNil).sort(sortByMiniMetadataId),
        })
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    )
  }

  get storage$() {
    return this.#storage$
  }

  #nextStorage(value: ProviderBalancesStorage) {
    this.#storageValue = value
    this.#storage.next(value)
  }

  private get storedMiniMetadataMapById$() {
    return this.#storage.pipe(
      // storage.miniMetadatas is already keyed by id, and its object reference is only
      // replaced when miniMetadatas are actually written (see getMiniMetadatas$ tap) —
      // so a reference compare replaces the old keyBy + deep isEqual on every emission
      map((storage) => storage.miniMetadatas),
      distinctUntilChanged(),
      shareReplay(1)
    )
  }

  // this is the only public method
  public getBalances$(
    addressesByTokenId: Record<TokenId, Address[]>,
    options?: { btcAccounts?: BtcAccountsMeta }
  ): Observable<BalancesResult> {
    return this.cleanupAddressesByTokenId$(addressesByTokenId).pipe(
      map(
        // split by network
        (addressesByTokenId): Record<NetworkId, Record<TokenId, Address[]>> =>
          toPairs(addressesByTokenId).reduce(
            (acc, [tokenId, addresses]) => {
              const networkId = parseTokenId(tokenId).networkId
              if (!acc[networkId]) acc[networkId] = {}
              acc[networkId][tokenId] = addresses
              return acc
            },
            {} as Record<NetworkId, Record<TokenId, Address[]>>
          )
      ),
      switchMap((addressesByTokenIdByNetworkId) => {
        // after cleanup we might end up without entries to fetch, which would break the combineLatest below
        if (!keys(addressesByTokenIdByNetworkId).length) return of({ isStale: false, results: [] })

        // fetch balances and start a 30s timer to mark the whole subscription live after 30s
        return combineLatest({
          isStale: timer(30_000).pipe(
            map(() => true),
            startWith(false)
          ),
          results: combineLatest(
            toPairs(addressesByTokenIdByNetworkId).map(([networkId]) =>
              this.getNetworkBalances$(
                networkId,
                addressesByTokenIdByNetworkId[networkId],
                options?.btcAccounts
              )
            )
          ).pipe(
            // each network is an independent emission train (per-block for substrate
            // subscriptions, 6s polls for the rest): coalesce near-simultaneous network
            // emissions so the aggregation below runs at most once per window instead of
            // once per network (matters most during the startup storm)
            auditTime(100)
          ),
        })
      }),
      // aggregation is time-sliced: yields the JS thread on budget, and a newer emission
      // aborts the in-flight pass (latest-wins)
      switchMapChunked(
        async ({ isStale, results }, { slicer }): Promise<BalancesResult> => {
          const balanceArrays = await mapWithYield(
            results,
            (result) => (isStale ? result.balances.map(getSweepStaleVariant) : result.balances),
            { slicer }
          )

          return {
            status:
              !isStale && results.some(({ status }) => status === "initialising")
                ? "initialising"
                : "live",
            // per-network arrays are already sorted (see getNetworkBalances$): merge instead
            // of re-sorting the whole set
            balances: await mergeSortedBalanceArrays(balanceArrays, slicer),
            failedBalanceIds: results.flatMap((result) => result.failedBalanceIds),
          }
        },
        { label: "balances aggregate" }
      ),
      distinctUntilChanged(isEqualBalancesResult)
    )
  }

  public fetchBalances(
    addressesByTokenId: Record<TokenId, Address[]>,
    options?: { btcAccounts?: BtcAccountsMeta }
  ): Promise<IBalance[]> {
    return firstValueFrom(
      this.getBalances$(addressesByTokenId, options).pipe(
        filter(({ status }) => status === "live"),
        map(({ balances }) => balances)
      )
    )
  }

  public getDetectedTokensId$(address: string): Observable<TokenId[]> {
    return getDetectedTokensIds$(address)
  }

  private getNetworkBalances$(
    networkId: string,
    addressesByTokenId: Record<TokenId, Address[]>,
    btcAccounts?: BtcAccountsMeta
  ): Observable<BalancesResult> {
    const network$ = this.#chaindataProvider.getNetworkById$(networkId)
    const tokensMapById$ = this.#chaindataProvider.getTokensMapById$()

    return combineLatest([network$, tokensMapById$]).pipe(
      // only re-subscribe the module pipelines below when THIS network or the tokens THIS
      // pipeline uses actually change — chaindata emissions for unrelated networks/tokens
      // must not tear down live balance subscriptions. Relies on chaindata-provider's
      // per-item reference stability (combinedChaindata section stabilizer).
      map(([network, tokensMapById]) => ({
        network,
        // keys(addressesByTokenId) and toPairs(addressesByTokenId) enumerate in the same
        // order, so indexing tokens by position below is safe
        tokens: keys(addressesByTokenId).map((tokenId) => tokensMapById[tokenId]),
      })),
      distinctUntilChanged(
        (a, b) => a.network === b.network && a.tokens.every((token, i) => token === b.tokens[i])
      ),
      switchMap(({ network, tokens }) => {
        const tokensAndAddresses: TokensWithAddresses = toPairs(addressesByTokenId).map(
          ([, addresses], i) => [tokens[i], addresses] as [Token, Address[]]
        )

        return combineLatest(
          BALANCE_MODULES.filter((mod) => mod.platform === network?.platform).map((mod) => {
            const tokensWithAddresses = tokensAndAddresses.filter(
              // token is undefined when the request map references a tokenId missing
              // from chaindata (e.g. a custom or dynamic token this provider doesn't
              // know) — skip those instead of throwing and killing the whole stream
              ([token]) => token?.type === mod.type
            )

            switch (mod.platform) {
              case "ethereum": {
                return this.getEthereumNetworkModuleBalances$(networkId, tokensWithAddresses, mod)
              }
              case "solana": {
                return this.getSolanaNetworkModuleBalances$(networkId, tokensWithAddresses, mod)
              }
              case "bitcoin": {
                return this.getBitcoinNetworkModuleBalances$(
                  networkId,
                  tokensWithAddresses,
                  mod,
                  btcAccounts
                )
              }
              case "polkadot": {
                return this.getPolkadotNetworkModuleBalances$(networkId, tokensWithAddresses, mod)
              }
              default: {
                log.warn("[balances] Unsupported network platform for module", { networkId, mod })
                return of<BalancesResult>({ status: "live", balances: [], failedBalanceIds: [] })
              }
            }
          })
        )
      }),
      switchMapChunked(
        async (results, { slicer }): Promise<BalancesResult> => {
          // for each balance that could not be fetched, see if we have a stored balance and return it, marked as stale
          const errorBalanceIds = results.flatMap((result) => result.failedBalanceIds)
          const staleBalances = errorBalanceIds
            .map((balanceId) => this.#storageValue.balances[balanceId])
            .filter(isNotNil)
            .map(getStaleVariant)

          const balances = results.flatMap((result) => result.balances).concat(staleBalances)

          // yield before the (atomic) sort so it starts on a fresh slice; per-network result
          // sets are small enough that the sort itself stays within a frame
          const yielded = slicer.yieldIfNeeded()
          if (yielded) await yielded

          return {
            status: results.some(({ status }) => status === "initialising")
              ? "initialising"
              : "live",
            balances: balances.sort(sortByBalanceId),
            failedBalanceIds: [],
          }
        },
        { label: `network balances ${networkId}` }
      ),
      distinctUntilChanged(isEqualBalancesResult)
    )
  }

  private getPolkadotNetworkModuleBalances$(
    networkId: DotNetworkId,
    tokensWithAddresses: TokensWithAddresses,
    mod: Extract<(typeof BALANCE_MODULES)[number], { platform: "polkadot" }>
  ): Observable<BalancesResult> {
    return getSharedObservable(
      `BalancesProvider.getPolkadotNetworkModuleBalances$`,
      { networkId, mod, tokensWithAddresses },
      () => {
        if (!tokensWithAddresses.length)
          return of<BalancesResult>({ status: "live", balances: [], failedBalanceIds: [] })

        const moduleAddressesByTokenId = fromPairs(
          tokensWithAddresses.map(([token, addresses]) => [token.id, addresses])
        )

        // all balance ids expected in result set
        const balanceIds = toPairs(moduleAddressesByTokenId).flatMap(([tokenId, addresses]) =>
          addresses.map((address) => getBalanceId({ tokenId, address }))
        )

        if (!this.#chainConnectors.substrate) {
          log.warn("[balances] no substrate connector or miniMetadata for module", mod.type)
          return defer(() =>
            of<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            })
          )
        }

        const moduleBalances$ = this.getNetworkMiniMetadatas$(networkId).pipe(
          map((miniMetadatas) => miniMetadatas.find((m) => m.source === mod.type)),
          switchMap((miniMetadata) =>
            mod.subscribeBalances({
              networkId,
              tokensWithAddresses,
              connector: this.#chainConnectors.substrate!,
              miniMetadata: miniMetadata as AnyMiniMetadata,
            })
          ),
          // keep unchanged balances reference-stable across emissions (module decode
          // allocates all-new objects every block), so downstream fingerprint caches and
          // per-item === compares hit instead of re-serializing the whole result set.
          // dtao ships its own drift classifier (inside its subscribeBalances); everyone
          // else gets the generic small-amount-drift classifier so continuously-moving
          // positions (LP shares, yield-bearing tokens) can't re-emit on every poll
          stabilizeModuleResults(
            mod.type === "substrate-dtao"
              ? undefined
              : classifySmallAmountDrift(GENERIC_DRIFT_TOLERANCE_BPS)
          ),
          catchError(() => EMPTY), // don't emit, let provider mark balances stale
          tap((results) => {
            // marks which module's poll/subscription just produced results, so JS-thread
            // stall reports can attribute blocked windows to the right pipeline
            reportJsActivity(`module ${mod.type} ${networkId} (${results.success.length})`)

            if (results.dynamicTokens?.length) {
              // register missing tokens in the chaindata provider
              this.#chaindataProvider.registerDynamicTokens(results.dynamicTokens)
            }
          }),
          map(
            (results): BalancesResult => ({
              status: "live",
              // exclude zero balances, but keep balances that only hold a lock
              // (eg dtao conviction locks, reported on the subnet's base token — including
              // zero-mass "ghost" locks with residual conviction, which still pin the hotkey
              // of future lock_stake calls)
              // raw helpers instead of new Balance(b): this filter runs per result per
              // block, and Balance.total allocates several BalanceFormatters per access
              balances: results.success.filter((b) => {
                const rawLocks = getRawLocks(b)
                return (
                  getRawTotalPlanck(b) > 0n ||
                  rawLocks.some((lock) => BigInt(lock.amount) > 0n) ||
                  !!findDTaoConvictionLock(
                    rawLocks.map((lock) => ({
                      amount: { planck: BigInt(lock.amount) },
                      meta: lock.meta,
                    }))
                  )
                )
              }),
              failedBalanceIds: results.errors.map(({ tokenId, address }) =>
                getBalanceId({ tokenId, address })
              ),
            })
          ),
          tap((results) => {
            this.updateStorage$(balanceIds, results)
          }),
          // shareReplay + keepAlive(0) keep the subscription alive while root observable is being unsubscribed+resubscribed, in case any input change
          shareReplay({ refCount: true, bufferSize: 1 }),
          keepAlive(0)
        )

        // defer the startWith call to start with up to date balances each time the observable is re-subscribed to
        return defer(() =>
          moduleBalances$.pipe(
            startWith<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            })
          )
        )
      }
    )
  }

  private getEthereumNetworkModuleBalances$(
    networkId: DotNetworkId,
    tokensWithAddresses: TokensWithAddresses,
    mod: Extract<(typeof BALANCE_MODULES)[number], { platform: "ethereum" }>
  ): Observable<BalancesResult> {
    return getSharedObservable(
      `BalancesProvider.getEthereumNetworkModuleBalances$`,
      { networkId, mod, tokensWithAddresses },
      () => {
        if (!tokensWithAddresses.length)
          return of<BalancesResult>({ status: "live", balances: [], failedBalanceIds: [] })

        const moduleAddressesByTokenId = fromPairs(
          tokensWithAddresses.map(([token, addresses]) => [token.id, addresses])
        )

        // all balance ids expected in result set
        const balanceIds = toPairs(moduleAddressesByTokenId).flatMap(([tokenId, addresses]) =>
          addresses.map((address) => getBalanceId({ tokenId, address }))
        )

        if (!this.#chainConnectors.evm) {
          log.warn("[balances] no ethereum connector for module", mod.type)
          return defer(() =>
            of<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            })
          )
        }

        const moduleBalances$ = mod
          .subscribeBalances({
            networkId,
            tokensWithAddresses,
            connector: this.#chainConnectors.evm,
          })
          .pipe(
            tap((results) =>
              reportJsActivity(`module ${mod.type} ${networkId} (${results.success.length})`)
            ),
            // keep unchanged balances reference-stable across poll emissions (see the
            // polkadot pipeline for rationale)
            stabilizeModuleResults(classifySmallAmountDrift(GENERIC_DRIFT_TOLERANCE_BPS)),
            catchError(() => EMPTY), // don't emit, let provider mark balances stale
            map(
              (results): BalancesResult => ({
                status: "live",
                // exclude zero balances
                balances: results.success.filter((b) => getRawTotalPlanck(b) > 0n),
                failedBalanceIds: results.errors.map(({ tokenId, address }) =>
                  getBalanceId({ tokenId, address })
                ),
              })
            ),
            tap((results) => {
              this.updateStorage$(balanceIds, results)
            }),
            // shareReplay + keepAlive(0) keep the subscription alive while root observable is being unsubscribed+resubscribed, in case any input change
            shareReplay({ refCount: true, bufferSize: 1 }),
            keepAlive(0)
          )

        // defer the startWith call to start with up to date balances each time the observable is re-subscribed to
        return defer(() =>
          moduleBalances$.pipe(
            startWith<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            })
          )
        )
      }
    )
  }

  private getSolanaNetworkModuleBalances$(
    networkId: DotNetworkId,
    tokensWithAddresses: TokensWithAddresses,
    mod: Extract<(typeof BALANCE_MODULES)[number], { platform: "solana" }>
  ): Observable<BalancesResult> {
    return getSharedObservable(
      `BalancesProvider.getSolanaNetworkModuleBalances$`,
      { networkId, mod, tokensWithAddresses },
      () => {
        if (!tokensWithAddresses.length)
          return of<BalancesResult>({ status: "live", balances: [], failedBalanceIds: [] })

        const moduleAddressesByTokenId = fromPairs(
          tokensWithAddresses.map(([token, addresses]) => [token.id, addresses])
        )

        // all balance ids expected in result set
        const balanceIds = toPairs(moduleAddressesByTokenId).flatMap(([tokenId, addresses]) =>
          addresses.map((address) => getBalanceId({ tokenId, address }))
        )

        if (!this.#chainConnectors.solana) {
          log.warn("[balances] no solana connector for module", mod.type)
          return defer(() =>
            of<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            })
          )
        }

        const moduleBalances$ = mod
          .subscribeBalances({
            networkId,
            tokensWithAddresses,
            connector: this.#chainConnectors.solana,
          })
          .pipe(
            tap((results) =>
              reportJsActivity(`module ${mod.type} ${networkId} (${results.success.length})`)
            ),
            // keep unchanged balances reference-stable across poll emissions (see the
            // polkadot pipeline for rationale)
            stabilizeModuleResults(classifySmallAmountDrift(GENERIC_DRIFT_TOLERANCE_BPS)),
            catchError(() => EMPTY), // don't emit, let provider mark balances stale
            tap((results) => {
              if (results.dynamicTokens?.length) {
                // register missing tokens in the chaindata provider
                this.#chaindataProvider.registerDynamicTokens(results.dynamicTokens)
              }
            }),
            map(
              (results): BalancesResult => ({
                status: "live",
                // exclude zero balances
                balances: results.success.filter((b) => getRawTotalPlanck(b) > 0n),
                failedBalanceIds: results.errors.map(({ tokenId, address }) =>
                  getBalanceId({ tokenId, address })
                ),
              })
            ),
            tap((results) => {
              this.updateStorage$(balanceIds, results)
            }),
            // shareReplay + keepAlive(0) keep the subscription alive while root observable is being unsubscribed+resubscribed, in case any input change
            shareReplay({ refCount: true, bufferSize: 1 }),
            keepAlive(0)
          )

        // defer the startWith call to start with up to date balances each time the observable is re-subscribed to
        return defer(() =>
          moduleBalances$.pipe(
            startWith<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            })
          )
        )
      }
    )
  }

  private getBitcoinNetworkModuleBalances$(
    networkId: BtcNetworkId,
    tokensWithAddresses: TokensWithAddresses,
    mod: Extract<(typeof BALANCE_MODULES)[number], { platform: "bitcoin" }>,
    btcAccounts?: BtcAccountsMeta
  ): Observable<BalancesResult> {
    return getSharedObservable(
      `BalancesProvider.getBitcoinNetworkModuleBalances$`,
      { networkId, mod, tokensWithAddresses, btcAccounts },
      () => {
        if (!tokensWithAddresses.length)
          return of<BalancesResult>({ status: "live", balances: [], failedBalanceIds: [] })

        const moduleAddressesByTokenId = fromPairs(
          tokensWithAddresses.map(([token, addresses]) => [token.id, addresses])
        )

        // all balance ids expected in result set
        const balanceIds = toPairs(moduleAddressesByTokenId).flatMap(([tokenId, addresses]) =>
          addresses.map((address) => getBalanceId({ tokenId, address }))
        )

        if (!this.#chainConnectors.bitcoin) {
          log.warn("[balances] no bitcoin connector for module", mod.type)
          return defer(() =>
            of<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            })
          )
        }

        const moduleBalances$ = mod
          .subscribeBalances({
            networkId,
            tokensWithAddresses,
            connector: this.#chainConnectors.bitcoin,
            meta: btcAccounts,
          })
          .pipe(
            catchError(() => EMPTY), // don't emit, let provider mark balances stale
            map(
              (results): BalancesResult => ({
                status: "live",
                // exclude zero balances
                balances: results.success.filter((b) => getRawTotalPlanck(b) > 0n),
                failedBalanceIds: results.errors.map(({ tokenId, address }) =>
                  getBalanceId({ tokenId, address })
                ),
              })
            ),
            tap((results) => {
              this.updateStorage$(balanceIds, results)
            }),
            // shareReplay + keepAlive(0) keep the subscription alive while root observable is being unsubscribed+resubscribed, in case any input change
            shareReplay({ refCount: true, bufferSize: 1 }),
            keepAlive(0)
          )

        // defer the startWith call to start with up to date balances each time the observable is re-subscribed to
        return defer(() =>
          moduleBalances$.pipe(
            startWith<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            })
          )
        )
      }
    )
  }

  private updateStorage$(balanceIds: string[], balancesResult: BalancesResult) {
    if (balancesResult.status !== "live") return

    const storage = this.#storageValue
    const failedIds = new Set(balancesResult.failedBalanceIds)
    const incomingById = new Map(
      balancesResult.balances.map((b) => [getBalanceIdCached(b), b] as const)
    )

    // live-status bookkeeping runs before (and regardless of) the no-op detection: a
    // content-identical emission still confirms these balances as live
    const now = Date.now()
    for (const balanceId of incomingById.keys()) this.#lastLiveAt.set(balanceId, now)
    for (const balanceId of balanceIds) {
      if (!incomingById.has(balanceId) && !failedIds.has(balanceId))
        this.#lastLiveAt.delete(balanceId)
    }
    for (const balanceId of failedIds) this.#lastLiveAt.delete(balanceId)

    // no-op detection: on quiet blocks nothing changed — skip the merge, the storage$
    // re-projection/sort and the host's downstream persistence entirely.
    // fingerprints are status-agnostic (stored entries carry "cache", results "live"),
    // so status transitions are checked separately.
    let changed = false
    for (const [balanceId, balance] of incomingById) {
      const stored = storage.balances[balanceId]
      if (
        stored?.status !== "cache" || // missing, or e.g. a stale entry recovering
        getBalanceStorageFingerprint(stored) !== getBalanceStorageFingerprint(balance)
      ) {
        changed = true
        break
      }
    }
    if (!changed) {
      // balances expected in the result set but absent (and not failed) mean they are now
      // empty and must be removed
      for (const balanceId of balanceIds) {
        if (failedIds.has(balanceId) || incomingById.has(balanceId)) continue
        if (storage.balances[balanceId]) {
          changed = true
          break
        }
      }
    }
    if (!changed) {
      // failed balances transition to stale
      for (const errorBalanceId of balancesResult.failedBalanceIds) {
        const stored = storage.balances[errorBalanceId]
        if (stored && stored.status !== "stale") {
          changed = true
          break
        }
      }
    }
    if (!changed) return

    const balances = { ...storage.balances }
    // delete all balances expected in the result set (except the ones that failed). because if they are not present it means they are empty.
    for (const balanceId of balanceIds) {
      if (!failedIds.has(balanceId) && !incomingById.has(balanceId)) delete balances[balanceId]
    }
    // storage balances must have status "cache", because they are used as start value when initialising subsequent subscriptions
    for (const [balanceId, balance] of incomingById) {
      balances[balanceId] = { ...balance, status: "cache" } as IBalance
    }

    // update status of stale balances (copy, don't mutate: stored objects may be shared
    // with previous storage snapshots and with the fingerprint caches)
    for (const errorBalanceId of balancesResult.failedBalanceIds) {
      const balance = balances[errorBalanceId]
      if (balance && balance.status !== "stale")
        balances[errorBalanceId] = { ...balance, status: "stale" } as IBalance
    }

    this.#nextStorage({ ...storage, balances })
  }

  private getNetworkMiniMetadatas$(networkId: NetworkId): Observable<MiniMetadata[]> {
    return getSharedObservable(`BalancesProvider.getNetworkMiniMetadatas$`, { networkId }, () => {
      return this.#chaindataProvider.getNetworkById$(networkId).pipe(
        switchMap((network) =>
          isNetworkDot(network)
            ? this.getNetworkSpecVersion$(networkId).pipe(
                switchMap((specVersion) =>
                  specVersion === null ? of([]) : this.getMiniMetadatas$(networkId, specVersion)
                )
              )
            : of([])
        ),
        distinctUntilChanged<MiniMetadata[]>(isEqualMiniMetadatas)
      )
    })
  }

  private getNetworkSpecVersion$(networkId: NetworkId): Observable<number | null> {
    return from(
      withRetry(() => getSpecVersion(this.#chainConnectors.substrate!, networkId), {
        delay: 2_000,
        shouldRetry: (err) => {
          log.warn("Failed to fetch spec version for network, retrying...", networkId, err)
          return true // don't give up mate!
        },
      })
    ).pipe(
      catchError(() => {
        log.warn("Failed to fetch spec version for network", networkId)
        return of(null as number | null)
      })
    )
  }

  private getMiniMetadatas$(
    networkId: DotNetworkId,
    specVersion: number
  ): Observable<MiniMetadata[]> {
    const miniMetadataIds = BALANCE_MODULES.filter((mod) => mod.platform === "polkadot").map(
      (mod) =>
        deriveMiniMetadataId({
          chainId: networkId,
          specVersion,
          source: mod.type,
        })
    )

    return combineLatest({
      defaultMiniMetadatas: this.getDefaultMiniMetadatas$(miniMetadataIds),
      storedMiniMetadatas: this.getStoredMiniMetadatas$(miniMetadataIds),
    }).pipe(
      switchMap(({ storedMiniMetadatas, defaultMiniMetadatas }) => {
        if (defaultMiniMetadatas) return of(defaultMiniMetadatas)
        if (storedMiniMetadatas) return of(storedMiniMetadatas)
        if (!this.#chainConnectors.substrate) return of([])

        return from(
          withRetry(
            () =>
              // can fail if metadata cant be fetched
              getMiniMetadatas(
                this.#chainConnectors.substrate!,
                this.#chaindataProvider,
                networkId,
                specVersion
              ),
            {
              delay: 2_000,
              shouldRetry: (err) => {
                log.warn("Failed to fetch minimetadata for %s, retrying...", networkId, err)
                return true // don't give up mate!
              },
            }
          )
        ).pipe(
          catchError(() => {
            log.warn("Failed to fetch metadata for network", networkId)
            return of([])
          }),
          // and persist in storage for later reuse
          tap((newMiniMetadatas) => {
            if (!newMiniMetadatas.length) return
            const storage = this.#storageValue
            const miniMetadatas = assign(
              // keep minimetadatas of other networks
              keyBy(
                values(storage.miniMetadatas).filter((m) => m.chainId !== networkId),
                (m) => m.id
              ),
              // add the ones for our network
              keyBy(newMiniMetadatas, (m) => m.id)
            )

            this.#nextStorage(assign({}, storage, { miniMetadatas }))
          })
        )
      }),
      // emit only when mini metadata changes, as a change here would restart all subscriptions for the network
      distinctUntilChanged<MiniMetadata[]>(isEqualMiniMetadatas)
    )
  }

  private getStoredMiniMetadatas$(miniMetadataIds: string[]): Observable<MiniMetadata[] | null> {
    return this.storedMiniMetadataMapById$.pipe(
      map((mapById) => {
        const miniMetadatas = miniMetadataIds.map((id) => mapById[id])
        return miniMetadatas.length && miniMetadatas.every(isTruthy) ? miniMetadatas : null
      }),
      // source changes very often
      distinctUntilChanged<MiniMetadata[] | null>(isEqualMiniMetadatas)
    )
  }

  private getDefaultMiniMetadatas$(miniMetadataIds: string[]): Observable<MiniMetadata[] | null> {
    return this.#chaindataProvider.miniMetadatasMapById$.pipe(
      map((mapById) => {
        const miniMetadatas = miniMetadataIds.map((id) => mapById[id])
        return miniMetadatas.length && miniMetadatas.every(isTruthy) ? miniMetadatas : null
      })
    )
  }

  private getStoredBalances(addressesByToken: Record<TokenId, Address[]>) {
    const balanceDefs = toPairs(addressesByToken).flatMap(([tokenId, addresses]) =>
      addresses.map((address) => [tokenId, address] as [TokenId, Address])
    )

    const now = Date.now()
    return balanceDefs
      .map(([tokenId, address]) => {
        const balanceId = getBalanceId({ address, tokenId })
        const stored = this.#storageValue.balances[balanceId]
        if (!stored) return stored
        // balances confirmed live recently enough seed with their exact last live result
        // — downstream fingerprints match and the UI keeps its Balance instances. Older
        // confirmations mean the balance's scope left the subscription for a while
        // (network/token deactivated, account removed, machine slept): that data is
        // genuinely old, and the cache status with its loading state is the honest signal
        const lastLiveAt = this.#lastLiveAt.get(balanceId)
        return lastLiveAt !== undefined && now - lastLiveAt < LIVE_SEED_MAX_AGE_MS
          ? getLiveVariant(stored)
          : stored
      })
      .filter(isNotNil)
      .sort(sortByBalanceId) as IBalance[]
  }

  private cleanupAddressesByTokenId$(addressesByTokenId: Record<TokenId, Address[]>) {
    return this.#chaindataProvider.getNetworksMapById$().pipe(
      map((networksById): Record<TokenId, Address[]> => {
        return fromPairs(
          toPairs(addressesByTokenId)
            .map(([tokenId, addresses]) => {
              const networkId = parseTokenId(tokenId).networkId
              const network = networksById[networkId]
              return [
                tokenId,
                uniq(addresses.map(normalizeAddress)).filter(
                  (address) => network && isAddressCompatibleWithNetwork(network, address)
                ),
              ] as [TokenId, Address[]]
            })
            .filter(([, addresses]) => addresses.length > 0)
        )
      }),
      // the produced record is small (token ids → addresses): a deep compare here
      // prevents unrelated network-map emissions from re-running the whole getBalances$
      // switchMap (which would tear down and restart every module subscription)
      distinctUntilChanged<Record<TokenId, Address[]>>(isEqual)
    )
  }
}

const isAccountPlatformCompatibleWithNetwork = (network: Network, platform: AccountPlatform) => {
  switch (network.platform) {
    case "ethereum":
      return platform === "ethereum"
    case "solana":
      return platform === "solana"
    case "bitcoin":
      return platform === "bitcoin"
    case "polkadot": {
      switch (network.account) {
        case "secp256k1":
          return platform === "ethereum"
        case "*25519":
          return platform === "polkadot"
        default:
          throw new Error(`Unsupported polkadot network account type ${network.account}`)
      }
    }
    default:
      log.warn("Unsupported network platform", network)
      throw new Error("Unsupported network platform")
  }
}

/**
 * If this is the address of an account, use isAccountCompatibleWithChain instead.
 * Otherwise it could lead to a loss of funds
 * @param chain
 * @param address
 * @returns
 */
const isAddressCompatibleWithNetwork = (network: Network, address: string) => {
  // TODO try with return true to check if wallet filters correctly upfront
  const accountPlatform = getAccountPlatformFromAddress(address)
  return isAccountPlatformCompatibleWithNetwork(network, accountPlatform)
}

// memoized: getBalanceId is called O(n log n) times per sort, on every storage$ emission
const balanceIdCache = new WeakMap<IBalance, string>()
const getBalanceIdCached = (balance: IBalance): string => {
  let id = balanceIdCache.get(balance)
  if (id === undefined) {
    id = getBalanceId(balance)
    balanceIdCache.set(balance, id)
  }
  return id
}

// plain string compare instead of localeCompare: ids are ASCII `address::tokenId` and
// locale collation is ~10x slower (note: sort order differs for non-ASCII ids only)
const sortByBalanceId = (a: IBalance, b: IBalance) => {
  const aId = getBalanceIdCached(a)
  const bId = getBalanceIdCached(b)
  return aId < bId ? -1 : aId > bId ? 1 : 0
}

// memoized `{ ...b, status: "stale" }`: stale-marking runs on every aggregation pass
// while a network is stale/failed, and a fresh copy each pass would break the reference
// stability that downstream fingerprint caches and === compares rely on
const staleVariants = new WeakMap<IBalance, IBalance>()
const getStaleVariant = (balance: IBalance): IBalance => {
  if (balance.status === "stale") return balance
  let variant = staleVariants.get(balance)
  if (variant === undefined) {
    variant = { ...balance, status: "stale" } as IBalance
    staleVariants.set(balance, variant)
  }
  return variant
}

// seeds only re-emit "live" for balances confirmed live this recently. Connected module
// subscriptions refresh their timestamps on every emission (~6s polls, per-block
// substrate), so the window only expires when a balance's scope left the subscription
// (network/token deactivated, account removed) or the machine slept
const LIVE_SEED_MAX_AGE_MS = 5 * 60_000

// memoized `{ ...b, status: "live" }`: seeds re-emit on every pipeline restart, and a
// reference-stable variant lets downstream fingerprint caches and === compares treat
// repeated seeds of the same stored entry as unchanged
const liveVariants = new WeakMap<IBalance, IBalance>()
const seededLiveVariants = new WeakSet<IBalance>()
const getLiveVariant = (balance: IBalance): IBalance => {
  if (balance.status === "live") return balance
  let variant = liveVariants.get(balance)
  if (variant === undefined) {
    variant = { ...balance, status: "live" } as IBalance
    liveVariants.set(balance, variant)
    seededLiveVariants.add(variant)
  }
  return variant
}

// the periodic stale sweep must also downgrade seeded live variants: their status is
// inherited from before a restart, not confirmed by a module emission on the current
// subscription — a module that never re-emits (dead RPC) would otherwise leave seed
// content labelled live forever. Exported for tests
export const getSweepStaleVariant = (balance: IBalance): IBalance =>
  balance.status !== "live" || seededLiveVariants.has(balance) ? getStaleVariant(balance) : balance

const mergeTwoSortedBalanceArrays = async (
  a: IBalance[],
  b: IBalance[],
  slicer: TimeSlicer
): Promise<IBalance[]> => {
  if (!a.length) return b
  if (!b.length) return a

  const merged: IBalance[] = new Array(a.length + b.length)
  let i = 0
  let j = 0
  let k = 0
  while (i < a.length && j < b.length) {
    const yielded = slicer.yieldIfNeeded()
    if (yielded) await yielded
    merged[k++] = sortByBalanceId(a[i], b[j]) <= 0 ? a[i++] : b[j++]
  }
  while (i < a.length) merged[k++] = a[i++]
  while (j < b.length) merged[k++] = b[j++]
  return merged
}

/**
 * K-way merge of per-network arrays that are each already sorted by balance id —
 * O(N log K) instead of the O(N log N) full re-sort, and it yields the JS thread on
 * budget (Array.prototype.sort is atomic and cannot).
 */
const mergeSortedBalanceArrays = async (
  arrays: IBalance[][],
  slicer: TimeSlicer
): Promise<IBalance[]> => {
  if (!arrays.length) return []

  let round = arrays
  while (round.length > 1) {
    const next: IBalance[][] = []
    for (let i = 0; i < round.length; i += 2) {
      next.push(
        i + 1 < round.length
          ? await mergeTwoSortedBalanceArrays(round[i], round[i + 1], slicer)
          : round[i]
      )
    }
    round = next
  }
  return round[0]
}

const sortByMiniMetadataId = (a: MiniMetadata, b: MiniMetadata) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0
