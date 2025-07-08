import {
  AnyMiniMetadata,
  ChaindataProvider,
  isNetworkDot,
  parseTokenId,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { assign, fromPairs, isEqual, keyBy, keys, toPairs, uniq, values } from "lodash"
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  from,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  tap,
} from "rxjs"

import { Balance, BALANCE_MODULES, ChainConnectors } from "."
import { getMiniMetadatas } from "./getMiniMetadata/getMiniMetadatas"
import log from "./log"
import { TokensWithAddresses } from "./modules/IBalanceModule"
import { Address, getBalanceId, IBalance } from "./types"

type BalancesStatus = "initialising" | "live"

export type BalancesResult = {
  status: BalancesStatus
  balances: IBalance[]
}

export type BalancesStorage = {
  balances: IBalance[]
  miniMetadatas: AnyMiniMetadata[]
}

type ProviderBalancesStorage = {
  balances: Record<string, IBalance>
  miniMetadatas: Record<string, AnyMiniMetadata>
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

  getBalances$(addressesByToken: Record<TokenId, Address[]>): Observable<BalancesResult> {
    const networkIds = uniq(
      keys(addressesByToken).map((tokenId) => parseTokenId(tokenId).networkId),
    )

    return combineLatest(
      networkIds.map((networkId) => this.getNetworkBalances$(networkId, addressesByToken)),
    ).pipe(
      map((results) => {
        return {
          status: results.some(({ status }) => status === "initialising") ? "initialising" : "live",
          balances: results.flatMap((result) => result.balances),
        } as BalancesResult
      }),
      startWith({
        status: "initialising",
        balances: this.getStoredBalances(addressesByToken),
      } as BalancesResult),
      distinctUntilChanged<BalancesResult>(isEqual),
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
                    miniMetadata: miniMetadata,
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

  private getNetworkMiniMetadatas$(networkId: string): Observable<AnyMiniMetadata[]> {
    return this.#chaindataProvider
      .getNetworkById$(networkId)
      .pipe(
        switchMap((network) =>
          isNetworkDot(network) && this.#chainConnectors.substrate
            ? from(
                getMiniMetadatas(
                  this.#chainConnectors.substrate,
                  this.#chaindataProvider,
                  networkId,
                ),
              )
            : of([]),
        ),
      )
  }

  private getStoredBalances(addressesByToken: Record<TokenId, Address[]>) {
    const balanceDefs = toPairs(addressesByToken).flatMap(([tokenId, addresses]) =>
      addresses.map((address) => [tokenId, address] as [TokenId, Address]),
    )

    return balanceDefs
      .map(([tokenId, address]) => this.#storage.value.balances[getBalanceId({ address, tokenId })])
      .filter(isNotNil)
  }
}

// const getStoredBalances = (
//   storedBalances: Record<string, IBalance>,
//   addressesByToken: Record<TokenId, Address[]>,
// ): IBalance[] => {

// }
