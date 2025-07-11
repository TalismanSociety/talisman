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
import {
  getSharedObservable,
  isEthereumAddress,
  isNotNil,
  isTruthy,
  keepAlive,
} from "@talismn/util"
import { assign, fromPairs, isEqual, keyBy, toPairs, values } from "lodash-es"
import {
  BehaviorSubject,
  catchError,
  combineLatest,
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
import { Address, deriveMiniMetadataId, getBalanceId, IBalance, MiniMetadata } from "./types"
import { TokensWithAddresses } from "./types/IBalanceModule"

type BalancesStatus = "initialising" | "live"

export type BalancesResult = {
  status: BalancesStatus
  balances: IBalance[]
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
      switchMap((addressesByTokenIdByNetworkId) =>
        // fetch balances and start a 30s timer to mark the whole subscription live after 30s
        combineLatest({
          isStale: timer(30_000).pipe(
            map(() => true),
            startWith(false),
          ),
          results: combineLatest(
            toPairs(addressesByTokenIdByNetworkId).map(([networkId]) =>
              this.getNetworkBalances$(networkId, addressesByTokenIdByNetworkId[networkId]),
            ),
          ),
        }),
      ),
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
        }),
      ),
      startWith({
        status: "initialising",
        balances: this.getStoredBalances(addressesByTokenId),
      } as BalancesResult),
      distinctUntilChanged<BalancesResult>(isEqual),
    )
  }

  public fetchBalances(addressesByTokenId: Record<TokenId, Address[]>): Promise<IBalance[]> {
    // TODO: better
    return firstValueFrom(
      this.getBalances$(addressesByTokenId).pipe(
        filter(({ status }) => status === "live"),
        map(({ balances }) => balances),
      ),
    )
  }

  private getNetworkBalances$(
    networkId: string,
    addressesByTokenId: Record<TokenId, Address[]>,
  ): Observable<BalancesResult> {
    return getSharedObservable(
      `BalancesProvider.getNetorkBalances$`,
      { networkId, addressesByTokenId },
      () => {
        const network$ = this.#chaindataProvider.getNetworkById$(networkId)
        const tokensMapById$ = this.#chaindataProvider.getTokensMapById$()
        const miniMetadatas$ = this.getNetworkMiniMetadatas$(networkId)

        return combineLatest([network$, miniMetadatas$, tokensMapById$]).pipe(
          switchMap(([network, miniMetadatas, tokensMapById]) => {
            const tokensAndAddresses: TokensWithAddresses = toPairs(addressesByTokenId).map(
              ([tokenId, addresses]) => [tokensMapById[tokenId], addresses] as [Token, Address[]],
            )

            return combineLatest(
              BALANCE_MODULES.filter((mod) => mod.platform === network?.platform).map((mod) => {
                const tokensWithAddresses = tokensAndAddresses.filter(
                  ([token]) => token.type === mod.type,
                )
                const moduleAddressesByTokenId = fromPairs(
                  tokensWithAddresses.map(([token, addresses]) => [token.id, addresses]),
                )
                const miniMetadata = miniMetadatas.find((m) => m.source === mod.type)

                // all balance ids expected in result set
                const balanceIds = toPairs(moduleAddressesByTokenId).flatMap(
                  ([tokenId, addresses]) =>
                    addresses.map((address) => getBalanceId({ tokenId, address })),
                )

                const initValue: BalancesResult = {
                  status: "initialising",
                  balances: this.getStoredBalances(moduleAddressesByTokenId),
                }

                // updating storage has to be done on a per-module basis, so we know which balances can be deleted
                const updateStorage = (results: BalancesResult) => {
                  if (results.status !== "live") return

                  const storage = this.#storage.getValue()
                  const balances = assign(
                    {},
                    storage.balances,
                    // delete all balances expected in the result set. because if they are not present it means they are empty.
                    fromPairs(balanceIds.map((balanceId) => [balanceId, undefined])),
                    keyBy(
                      // storage balances must have status "cache", because they are used as start value when initialising subsequent subscriptions
                      results.balances.map((b) => ({ ...b, status: "cache" })),
                      (b) => getBalanceId(b),
                    ),
                  )

                  this.#storage.next(assign({}, storage, { balances }))
                }

                switch (mod.platform) {
                  case "ethereum": {
                    if (!this.#chainConnectors.evm) return of<BalancesResult>(initValue)

                    return mod
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
                            balances: results.success.filter(
                              (b) => new Balance(b).total.planck > 0n,
                            ),
                          }),
                        ),
                        tap(updateStorage),
                        startWith(initValue),
                      )
                  }
                  case "polkadot":
                    if (!this.#chainConnectors.substrate || !miniMetadata) {
                      log.debug(
                        "[balances] no substrate connector or miniMetadata for polkadot",
                        mod.type,
                      )
                      return of<BalancesResult>(initValue)
                    }
                    return mod
                      .subscribeBalances({
                        networkId,
                        tokensWithAddresses,
                        connector: this.#chainConnectors.substrate,
                        miniMetadata: miniMetadata as AnyMiniMetadata,
                      })
                      .pipe(
                        catchError(() => EMPTY), // don't emit, let provider mark balances stale
                        map(
                          (results): BalancesResult => ({
                            status: "live",
                            // exclude zero balances
                            balances: results.success.filter(
                              (b) => new Balance(b).total.planck > 0n,
                            ),
                          }),
                        ),
                        tap(updateStorage),
                        startWith(initValue),
                      )
                }
              }),
            )
          }),
          map((results) => {
            return {
              status: results.some(({ status }) => status === "initialising")
                ? "initialising"
                : "live",
              balances: results.flatMap((result) => result.balances).sort(sortByBalanceId),
            } as BalancesResult
          }),
          startWith({
            status: "initialising" as BalancesStatus,
            balances: this.getStoredBalances(addressesByTokenId),
          } as BalancesResult),
          distinctUntilChanged<BalancesResult>(isEqual),
          // shareReplay + keepAlive allow for subscription to not restart as long as the inputs dont change
          // for example, if another network is enabled/disabled
          shareReplay({ refCount: true, bufferSize: 1 }),
          keepAlive(2_000),
        )
      },
    )
  }

  private getNetworkMiniMetadatas$(networkId: NetworkId): Observable<MiniMetadata[]> {
    return this.#chaindataProvider
      .getNetworkById$(networkId)
      .pipe(
        switchMap((network) =>
          isNetworkDot(network)
            ? this.getNetworkSpecVersion$(networkId).pipe(
                switchMap((specVersion) =>
                  specVersion === null ? of([]) : this.getMiniMetadatas$(networkId, specVersion),
                ),
              )
            : of([]),
        ),
      )
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
        return of(null)
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
                log.warn("Failed to metadata for network, retrying...", networkId, err)
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
      .sort(sortByBalanceId)
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
                addresses.filter(
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

export const isAddressCompatibleWithNetwork = (network: Network, address: Address) => {
  switch (network.platform) {
    case "ethereum":
      return isEthereumAddress(address)
    case "polkadot":
      return isEthereumAddress(address)
        ? network.account === "secp256k1"
        : network.account !== "secp256k1"
    default:
      log.warn("Unsupported network platform", network)
      throw new Error("Unsupported network platform")
  }
}

const sortByBalanceId = (a: IBalance, b: IBalance) => getBalanceId(a).localeCompare(getBalanceId(b))

const sortByMiniMetadataId = (a: MiniMetadata, b: MiniMetadata) => a.id.localeCompare(b.id)
