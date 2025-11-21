import {
  AnyMiniMetadata,
  ChaindataProvider,
  DotNetworkId,
  isNetworkDot,
  Network,
  NetworkId,
  parseTokenId,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { AccountPlatform, getAccountPlatformFromAddress, normalizeAddress } from "@talismn/crypto"
import { getSharedObservable, isNotNil, isTruthy, keepAlive } from "@talismn/util"
import { assign, fromPairs, isEqual, keyBy, keys, toPairs, uniq, values } from "lodash-es"
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
  firstValueFrom,
  from,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
  timer,
} from "rxjs"
import { withRetry } from "viem"

import { Balance, BALANCE_MODULES, ChainConnectors } from "."
import { getMiniMetadatas, getSpecVersion } from "./getMiniMetadatas"
import log from "./log"
import { getDetectedTokensIds$ } from "./modules/shared/detectedTokens"
import { Address, deriveMiniMetadataId, getBalanceId, IBalance, MiniMetadata } from "./types"
import { TokensWithAddresses } from "./types/IBalanceModule"

type BalancesStatus = "initialising" | "live"

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
  #storage: BehaviorSubject<ProviderBalancesStorage>

  constructor(
    chaindataProvider: ChaindataProvider,
    chainConnectors: ChainConnectors,
    storage: BalancesStorage = DEFAULT_STORAGE,
  ) {
    this.#chaindataProvider = chaindataProvider
    this.#chainConnectors = chainConnectors
    this.#storage = new BehaviorSubject<ProviderBalancesStorage>({
      balances: keyBy(storage.balances.filter(isNotNil), (b) => getBalanceId(b)),
      miniMetadatas: keyBy(storage.miniMetadatas.filter(isNotNil), (m) => m.id),
    })
  }

  get storage$() {
    return this.#storage.pipe(
      map(
        ({ balances, miniMetadatas }): BalancesStorage => ({
          balances: values(balances).filter(isNotNil).sort(sortByBalanceId),
          miniMetadatas: values(miniMetadatas).filter(isNotNil).sort(sortByMiniMetadataId),
        }),
        shareReplay(1),
      ),
    )
  }

  private get storedMiniMetadataMapById$() {
    return this.#storage.pipe(
      map((storage) => keyBy(storage.miniMetadatas, (m) => m.id)),
      distinctUntilChanged<Record<string, MiniMetadata>>(isEqual),
      shareReplay(1),
    )
  }

  // this is the only public method
  public getBalances$(addressesByTokenId: Record<TokenId, Address[]>): Observable<BalancesResult> {
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
            {} as Record<NetworkId, Record<TokenId, Address[]>>,
          ),
      ),
      switchMap((addressesByTokenIdByNetworkId) => {
        // after cleanup we might end up without entries to fetch, which would break the combineLatest below
        if (!keys(addressesByTokenIdByNetworkId).length) return of({ isStale: false, results: [] })

        // fetch balances and start a 30s timer to mark the whole subscription live after 30s
        return combineLatest({
          isStale: timer(30_000).pipe(
            map(() => true),
            startWith(false),
          ),
          results: combineLatest(
            toPairs(addressesByTokenIdByNetworkId).map(([networkId]) =>
              this.getNetworkBalances$(networkId, addressesByTokenIdByNetworkId[networkId]),
            ),
          ),
        })
      }),
      map(
        // combine
        ({ isStale, results }): BalancesResult => ({
          status:
            !isStale && results.some(({ status }) => status === "initialising")
              ? "initialising"
              : "live",
          balances: results
            .flatMap((result) =>
              result.balances.map(
                (b): IBalance => (isStale && b.status !== "live" ? { ...b, status: "stale" } : b),
              ),
            )
            .sort(sortByBalanceId),
          failedBalanceIds: results.flatMap((result) => result.failedBalanceIds),
        }),
      ),
      distinctUntilChanged<BalancesResult>(isEqual),
    )
  }

  public fetchBalances(addressesByTokenId: Record<TokenId, Address[]>): Promise<IBalance[]> {
    return firstValueFrom(
      this.getBalances$(addressesByTokenId).pipe(
        filter(({ status }) => status === "live"),
        map(({ balances }) => balances),
      ),
    )
  }

  public getDetectedTokensId$(address: string): Observable<TokenId[]> {
    return getDetectedTokensIds$(address)
  }

  private getNetworkBalances$(
    networkId: string,
    addressesByTokenId: Record<TokenId, Address[]>,
  ): Observable<BalancesResult> {
    const network$ = this.#chaindataProvider.getNetworkById$(networkId)
    const tokensMapById$ = this.#chaindataProvider.getTokensMapById$()

    return combineLatest([network$, tokensMapById$]).pipe(
      switchMap(([network, tokensMapById]) => {
        const tokensAndAddresses: TokensWithAddresses = toPairs(addressesByTokenId).map(
          ([tokenId, addresses]) => [tokensMapById[tokenId], addresses] as [Token, Address[]],
        )

        return combineLatest(
          BALANCE_MODULES.filter((mod) => mod.platform === network?.platform).map((mod) => {
            const tokensWithAddresses = tokensAndAddresses.filter(
              ([token]) => token.type === mod.type,
            )

            switch (mod.platform) {
              case "ethereum": {
                return this.getEthereumNetworkModuleBalances$(networkId, tokensWithAddresses, mod)
              }
              case "solana": {
                return this.getSolanaNetworkModuleBalances$(networkId, tokensWithAddresses, mod)
              }
              case "polkadot": {
                return this.getPolkadotNetworkModuleBalances$(networkId, tokensWithAddresses, mod)
              }
              default: {
                log.warn("[balances] Unsupported network platform for module", { networkId, mod })
                return of<BalancesResult>({ status: "live", balances: [], failedBalanceIds: [] })
              }
            }
          }),
        )
      }),
      map((results): BalancesResult => {
        // for each balance that could not be fetched, see if we have a stored balance and return it, marked as stale
        const errorBalanceIds = results.flatMap((result) => result.failedBalanceIds)
        const staleBalances = errorBalanceIds
          .map((balanceId) => this.#storage.value.balances[balanceId])
          .filter(isNotNil)
          .map((b): IBalance => ({ ...b, status: "stale" }))

        return {
          status: results.some(({ status }) => status === "initialising") ? "initialising" : "live",
          balances: results
            .flatMap((result) => result.balances)
            .concat(staleBalances)
            .sort(sortByBalanceId),
          failedBalanceIds: [],
        }
      }),
      distinctUntilChanged<BalancesResult>(isEqual),
    )
  }

  private getPolkadotNetworkModuleBalances$(
    networkId: DotNetworkId,
    tokensWithAddresses: TokensWithAddresses,
    mod: Extract<(typeof BALANCE_MODULES)[number], { platform: "polkadot" }>,
  ): Observable<BalancesResult> {
    return getSharedObservable(
      `BalancesProvider.getPolkadotNetworkModuleBalances$`,
      { networkId, mod, tokensWithAddresses },
      () => {
        if (!tokensWithAddresses.length)
          return of<BalancesResult>({ status: "live", balances: [], failedBalanceIds: [] })

        const moduleAddressesByTokenId = fromPairs(
          tokensWithAddresses.map(([token, addresses]) => [token.id, addresses]),
        )

        // all balance ids expected in result set
        const balanceIds = toPairs(moduleAddressesByTokenId).flatMap(([tokenId, addresses]) =>
          addresses.map((address) => getBalanceId({ tokenId, address })),
        )

        if (!this.#chainConnectors.substrate) {
          log.warn("[balances] no substrate connector or miniMetadata for module", mod.type)
          return defer(() =>
            of<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            }),
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
            }),
          ),
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
              balances: results.success.filter((b) => new Balance(b).total.planck > 0n),
              failedBalanceIds: results.errors.map(({ tokenId, address }) =>
                getBalanceId({ tokenId, address }),
              ),
            }),
          ),
          tap((results) => {
            this.updateStorage$(balanceIds, results)
          }),
          // shareReplay + keepAlive(0) keep the subscription alive while root observable is being unsubscribed+resubscribed, in case any input change
          shareReplay({ refCount: true, bufferSize: 1 }),
          keepAlive(0),
        )

        // defer the startWith call to start with up to date balances each time the observable is re-subscribed to
        return defer(() =>
          moduleBalances$.pipe(
            startWith<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            }),
          ),
        )
      },
    )
  }

  private getEthereumNetworkModuleBalances$(
    networkId: DotNetworkId,
    tokensWithAddresses: TokensWithAddresses,
    mod: Extract<(typeof BALANCE_MODULES)[number], { platform: "ethereum" }>,
  ): Observable<BalancesResult> {
    return getSharedObservable(
      `BalancesProvider.getEthereumNetworkModuleBalances$`,
      { networkId, mod, tokensWithAddresses },
      () => {
        if (!tokensWithAddresses.length)
          return of<BalancesResult>({ status: "live", balances: [], failedBalanceIds: [] })

        const moduleAddressesByTokenId = fromPairs(
          tokensWithAddresses.map(([token, addresses]) => [token.id, addresses]),
        )

        // all balance ids expected in result set
        const balanceIds = toPairs(moduleAddressesByTokenId).flatMap(([tokenId, addresses]) =>
          addresses.map((address) => getBalanceId({ tokenId, address })),
        )

        if (!this.#chainConnectors.evm) {
          log.warn("[balances] no ethereum connector for module", mod.type)
          return defer(() =>
            of<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            }),
          )
        }

        const moduleBalances$ = mod
          .subscribeBalances({
            networkId,
            tokensWithAddresses,
            connector: this.#chainConnectors.evm,
          })
          .pipe(
            catchError(() => EMPTY), // don't emit, let provider mark balances stale
            map(
              (results): BalancesResult => ({
                status: "live",
                // exclude zero balances
                balances: results.success.filter((b) => new Balance(b).total.planck > 0n),
                failedBalanceIds: results.errors.map(({ tokenId, address }) =>
                  getBalanceId({ tokenId, address }),
                ),
              }),
            ),
            tap((results) => {
              this.updateStorage$(balanceIds, results)
            }),
            // shareReplay + keepAlive(0) keep the subscription alive while root observable is being unsubscribed+resubscribed, in case any input change
            shareReplay({ refCount: true, bufferSize: 1 }),
            keepAlive(0),
          )

        // defer the startWith call to start with up to date balances each time the observable is re-subscribed to
        return defer(() =>
          moduleBalances$.pipe(
            startWith<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            }),
          ),
        )
      },
    )
  }

  private getSolanaNetworkModuleBalances$(
    networkId: DotNetworkId,
    tokensWithAddresses: TokensWithAddresses,
    mod: Extract<(typeof BALANCE_MODULES)[number], { platform: "solana" }>,
  ): Observable<BalancesResult> {
    return getSharedObservable(
      `BalancesProvider.getSolanaNetworkModuleBalances$`,
      { networkId, mod, tokensWithAddresses },
      () => {
        if (!tokensWithAddresses.length)
          return of<BalancesResult>({ status: "live", balances: [], failedBalanceIds: [] })

        const moduleAddressesByTokenId = fromPairs(
          tokensWithAddresses.map(([token, addresses]) => [token.id, addresses]),
        )

        // all balance ids expected in result set
        const balanceIds = toPairs(moduleAddressesByTokenId).flatMap(([tokenId, addresses]) =>
          addresses.map((address) => getBalanceId({ tokenId, address })),
        )

        if (!this.#chainConnectors.solana) {
          log.warn("[balances] no solana connector for module", mod.type)
          return defer(() =>
            of<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            }),
          )
        }

        const moduleBalances$ = mod
          .subscribeBalances({
            networkId,
            tokensWithAddresses,
            connector: this.#chainConnectors.solana,
          })
          .pipe(
            catchError(() => EMPTY), // don't emit, let provider mark balances stale
            map(
              (results): BalancesResult => ({
                status: "live",
                // exclude zero balances
                balances: results.success.filter((b) => new Balance(b).total.planck > 0n),
                failedBalanceIds: results.errors.map(({ tokenId, address }) =>
                  getBalanceId({ tokenId, address }),
                ),
              }),
            ),
            tap((results) => {
              this.updateStorage$(balanceIds, results)
            }),
            // shareReplay + keepAlive(0) keep the subscription alive while root observable is being unsubscribed+resubscribed, in case any input change
            shareReplay({ refCount: true, bufferSize: 1 }),
            keepAlive(0),
          )

        // defer the startWith call to start with up to date balances each time the observable is re-subscribed to
        return defer(() =>
          moduleBalances$.pipe(
            startWith<BalancesResult>({
              status: "initialising",
              balances: this.getStoredBalances(moduleAddressesByTokenId),
              failedBalanceIds: [],
            }),
          ),
        )
      },
    )
  }

  private updateStorage$(balanceIds: string[], balancesResult: BalancesResult) {
    if (balancesResult.status !== "live") return

    const storage = this.#storage.getValue()
    const balances = assign(
      {},
      storage.balances,
      // delete all balances expected in the result set (except the ones that failed). because if they are not present it means they are empty.
      fromPairs(
        balanceIds
          .filter((bid) => !balancesResult.failedBalanceIds.includes(bid))
          .map((balanceId) => [balanceId, undefined]),
      ),
      keyBy(
        // storage balances must have status "cache", because they are used as start value when initialising subsequent subscriptions
        balancesResult.balances.map((b) => ({ ...b, status: "cache" })),
        (b) => getBalanceId(b),
      ),
    )

    // update status of stale balances
    for (const errorBalanceId of balancesResult.failedBalanceIds) {
      const balance = balances[errorBalanceId] as IBalance
      if (balance) balance.status = "stale"
    }

    this.#storage.next(assign({}, storage, { balances }))
  }

  private getNetworkMiniMetadatas$(networkId: NetworkId): Observable<MiniMetadata[]> {
    return getSharedObservable(`BalancesProvider.getNetworkMiniMetadatas$`, { networkId }, () => {
      return this.#chaindataProvider.getNetworkById$(networkId).pipe(
        switchMap((network) =>
          isNetworkDot(network)
            ? this.getNetworkSpecVersion$(networkId).pipe(
                switchMap((specVersion) =>
                  specVersion === null ? of([]) : this.getMiniMetadatas$(networkId, specVersion),
                ),
              )
            : of([]),
        ),
        distinctUntilChanged<MiniMetadata[]>(isEqual),
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
      }),
    ).pipe(
      catchError(() => {
        log.warn("Failed to fetch spec version for network", networkId)
        return of(null as number | null)
      }),
    )
  }

  private getMiniMetadatas$(
    networkId: DotNetworkId,
    specVersion: number,
  ): Observable<MiniMetadata[]> {
    const miniMetadataIds = BALANCE_MODULES.filter((mod) => mod.platform === "polkadot").map(
      (mod) =>
        deriveMiniMetadataId({
          chainId: networkId,
          specVersion,
          source: mod.type,
        }),
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
                specVersion,
              ),
            {
              delay: 2_000,
              shouldRetry: (err) => {
                log.warn("Failed to fetch minimetadata for %s, retrying...", networkId, err)
                return true // don't give up mate!
              },
            },
          ),
        ).pipe(
          catchError(() => {
            log.warn("Failed to fetch metadata for network", networkId)
            return of([])
          }),
          // and persist in storage for later reuse
          tap((newMiniMetadatas) => {
            if (!newMiniMetadatas.length) return
            const storage = this.#storage.getValue()
            const miniMetadatas = assign(
              // keep minimetadatas of other networks
              keyBy(
                values(storage.miniMetadatas).filter((m) => m.chainId !== networkId),
                (m) => m.id,
              ),
              // add the ones for our network
              keyBy(newMiniMetadatas, (m) => m.id),
            )

            this.#storage.next(assign({}, storage, { miniMetadatas }))
          }),
        )
      }),
      // emit only when mini metadata changes, as a change here would restart all subscriptions for the network
      distinctUntilChanged<MiniMetadata[]>(isEqual),
    )
  }

  private getStoredMiniMetadatas$(miniMetadataIds: string[]): Observable<MiniMetadata[] | null> {
    return this.storedMiniMetadataMapById$.pipe(
      map((mapById) => {
        const miniMetadatas = miniMetadataIds.map((id) => mapById[id])
        return miniMetadatas.length && miniMetadatas.every(isTruthy) ? miniMetadatas : null
      }),
      // source changes very often
      distinctUntilChanged<MiniMetadata[] | null>(isEqual),
    )
  }

  private getDefaultMiniMetadatas$(miniMetadataIds: string[]): Observable<MiniMetadata[] | null> {
    return this.#chaindataProvider.miniMetadatasMapById$.pipe(
      map((mapById) => {
        const miniMetadatas = miniMetadataIds.map((id) => mapById[id])
        return miniMetadatas.length && miniMetadatas.every(isTruthy) ? miniMetadatas : null
      }),
    )
  }

  private getStoredBalances(addressesByToken: Record<TokenId, Address[]>) {
    const balanceDefs = toPairs(addressesByToken).flatMap(([tokenId, addresses]) =>
      addresses.map((address) => [tokenId, address] as [TokenId, Address]),
    )

    return balanceDefs
      .map(([tokenId, address]) => this.#storage.value.balances[getBalanceId({ address, tokenId })])
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
                  (address) => network && isAddressCompatibleWithNetwork(network, address),
                ),
              ] as [TokenId, Address[]]
            })
            .filter(([, addresses]) => addresses.length > 0),
        )
      }),
    )
  }
}

const isAccountPlatformCompatibleWithNetwork = (network: Network, platform: AccountPlatform) => {
  switch (network.platform) {
    case "ethereum":
      return platform === "ethereum"
    case "solana":
      return platform === "solana"
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

const sortByBalanceId = (a: IBalance, b: IBalance) => getBalanceId(a).localeCompare(getBalanceId(b))

const sortByMiniMetadataId = (a: MiniMetadata, b: MiniMetadata) => a.id.localeCompare(b.id)
