import {
  AnyMiniMetadata,
  ChaindataProvider,
  DotNetworkId,
  isNetworkDot,
  MINIMETADATA_VERSION,
  NetworkId,
  parseTokenId,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { getSharedObservable, isNotNil } from "@talismn/util"
import { assign, fromPairs, isEqual, keyBy, toPairs, values } from "lodash"
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  from,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  tap,
  timer,
} from "rxjs"

import { Balance, BALANCE_MODULES, ChainConnectors } from "."
import { getMiniMetadatas } from "./getMiniMetadata/getMiniMetadatas"
import { getSpecVersion } from "./getMiniMetadata/getSpecVersion"
import log from "./log"
import { TokensWithAddresses } from "./modules/IBalanceModule"
import { Address, getBalanceId, IBalance, MiniMetadata } from "./types"

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
          balances: values(balances).filter(isNotNil),
          miniMetadatas: values(miniMetadatas).filter(isNotNil),
        }),
      ),
    )
  }

  // this is the only public method
  public getBalances$(addressesByTokenId: Record<TokenId, Address[]>): Observable<BalancesResult> {
    // TODO move the getSharedObservable caching down to this.getNetworkBalances$ to prevent network-level subscriptions to restart when enabling/disabling other networks
    // this will require addressesByTokenId arg to be normalized/sorted so the cache key can be compared properly, seems a bit random atm
    return getSharedObservable("BalancesProvider.getBalances$", addressesByTokenId, () => {
      // split by network
      const addressesByTokenIdByNetworkId: Record<NetworkId, Record<TokenId, Address[]>> = toPairs(
        addressesByTokenId,
      ).reduce(
        (acc, [tokenId, addresses]) => {
          const networkId = parseTokenId(tokenId).networkId
          if (!acc[networkId]) acc[networkId] = {}
          acc[networkId][tokenId] = addresses
          return acc
        },
        {} as Record<NetworkId, Record<TokenId, Address[]>>,
      )

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
      }).pipe(
        map(
          ({ isStale, results }): BalancesResult => ({
            status:
              !isStale && results.some(({ status }) => status === "initialising")
                ? "initialising"
                : "live",
            balances: results
              .flatMap((result) => result.balances)
              .sort((a, b) => getBalanceId(a).localeCompare(getBalanceId(b))),
          }),
        ),
        startWith({
          status: "initialising",
          balances: this.getStoredBalances(addressesByTokenId),
        } as BalancesResult),
        distinctUntilChanged<BalancesResult>(isEqual),
      )
    })
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
            const balanceIds = toPairs(moduleAddressesByTokenId).flatMap(([tokenId, addresses]) =>
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
                keyBy(results.balances, (b) => getBalanceId(b)),
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
                    map(
                      (results): BalancesResult => ({
                        status: "live",
                        // exclude zero balances
                        balances: results.success.filter((b) => new Balance(b).total.planck > 0n),
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
                    map(
                      (results): BalancesResult => ({
                        status: "live",
                        // exclude zero balances
                        balances: results.success.filter((b) => new Balance(b).total.planck > 0n),
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
          status: results.some(({ status }) => status === "initialising") ? "initialising" : "live",
          balances: results.flatMap((result) => result.balances),
        } as BalancesResult
      }),
    )
  }

  private getNetworkMiniMetadatas$(networkId: NetworkId): Observable<MiniMetadata[]> {
    return this.#chaindataProvider
      .getNetworkById$(networkId)
      .pipe(
        switchMap((network) =>
          isNetworkDot(network) && this.#chainConnectors.substrate
            ? from(getSpecVersion(this.#chainConnectors.substrate, networkId)).pipe(
                switchMap((specVersion) => this.getMiniMetadatas$(networkId, specVersion)),
              )
            : of([]),
        ),
      )
  }

  private getMiniMetadatas$(
    networkId: DotNetworkId,
    specVersion: number,
  ): Observable<MiniMetadata[]> {
    return combineLatest({
      defaultMiniMetadatas: this.getDefaultMiniMetadatas$(networkId, specVersion),
      storedMiniMetadatas: this.getStoredMiniMetadatas$(networkId, specVersion),
    }).pipe(
      switchMap(({ storedMiniMetadatas, defaultMiniMetadatas }) => {
        if (defaultMiniMetadatas.length) return of(defaultMiniMetadatas)
        if (storedMiniMetadatas.length) return of(storedMiniMetadatas)
        if (!this.#chainConnectors.substrate) return of([])

        return from(
          // fetch them from the chain
          getMiniMetadatas(this.#chainConnectors.substrate!, this.#chaindataProvider, networkId),
        ).pipe(
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
    )
  }

  private getStoredMiniMetadatas$(
    networkId: string,
    specVersion: number,
  ): Observable<MiniMetadata[]> {
    return this.storage$.pipe(
      map((storage) =>
        storage.miniMetadatas.filter(
          (m) =>
            m.chainId === networkId &&
            m.specVersion === specVersion &&
            m.version === MINIMETADATA_VERSION,
        ),
      ),
      distinctUntilChanged<MiniMetadata[]>(isEqual),
    )
  }

  private getDefaultMiniMetadatas$(
    networkId: string,
    specVersion: number,
  ): Observable<MiniMetadata[]> {
    return this.#chaindataProvider.miniMetadatas$.pipe(
      map((miniMetadatas) =>
        miniMetadatas.filter(
          (m) =>
            m.chainId === networkId &&
            m.specVersion === specVersion &&
            m.version === MINIMETADATA_VERSION,
        ),
      ),
      distinctUntilChanged<MiniMetadata[]>(isEqual),
    )
  }

  private getStoredBalances(addressesByToken: Record<TokenId, Address[]>) {
    const balanceDefs = toPairs(addressesByToken).flatMap(([tokenId, addresses]) =>
      addresses.map((address) => [tokenId, address] as [TokenId, Address]),
    )

    return balanceDefs
      .map(([tokenId, address]) => this.#storage.value.balances[getBalanceId({ address, tokenId })])
      .filter(isNotNil)
      .sort((a, b) => getBalanceId(a).localeCompare(getBalanceId(b)))
  }
}
