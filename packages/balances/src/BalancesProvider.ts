import {
  AnyMiniMetadata,
  ChaindataProvider,
  isNetworkDot,
  parseTokenId,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { assign, fromPairs, keyBy, keys, toPairs, uniq, values } from "lodash"
import {
  BehaviorSubject,
  combineLatest,
  from,
  map,
  Observable,
  of,
  startWith,
  switchMap,
} from "rxjs"

import { BALANCE_MODULES, ChainConnectors } from "."
import { getMiniMetadatas } from "./getMiniMetadata/getMiniMetadatas"
import { TokensWithAddresses } from "./modules/IBalanceModule"
import { Address, getBalanceId, IBalance } from "./types"

type BalancesStorage = {
  balances: IBalance[]
  miniMetadatas: AnyMiniMetadata[]
}

const DEFAULT_STORAGE: BalancesStorage = {
  balances: [],
  miniMetadatas: [],
}

type BalancesStatus = "initialising" | "live"

type BalancesResult = {
  status: BalancesStatus
  balances: IBalance[]
}

export class BalancesProvider {
  #chaindataProvider: ChaindataProvider
  #chainConnectors: ChainConnectors
  #storage: BehaviorSubject<BalancesStorage>

  constructor(
    chaindataProvider: ChaindataProvider,
    chainConnectors: ChainConnectors,
    storage: BalancesStorage = DEFAULT_STORAGE,
  ) {
    this.#chaindataProvider = chaindataProvider
    this.#chainConnectors = chainConnectors
    this.#storage = new BehaviorSubject(storage)
  }

  get storage$() {
    return this.#storage.asObservable()
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
          BALANCE_MODULES.filter((mod) => mod.platform === network?.platform)

            .map((mod) => {
              const tokensWithAddresses = tokensAndAddresses.filter(
                ([token]) => token.type === mod.type,
              )
              const moduleAddressesByTokenId = fromPairs(
                tokensWithAddresses.map(([token, addresses]) => [token.id, addresses]),
              )
              const miniMetadata = miniMetadatas.find((m) => m.source === mod.type)

              const initValue: BalancesResult = {
                status: "initialising",
                balances: getStoredBalances(this.#storage.value.balances, moduleAddressesByTokenId),
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
                          balances: results.success,
                        }),
                      ),
                      startWith(initValue),
                    )
                }
                case "polkadot":
                  if (!this.#chainConnectors.substrate || !miniMetadata)
                    return of<BalancesResult>(initValue)

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
                          balances: results.success,
                        }),
                      ),
                      startWith(initValue),
                    )
              }
            }),
        )
      }),
      map((results) => {
        const liveBalances = results
          .filter(({ status }) => status === "live")
          .flatMap((result) => result.balances)
        this.updateStorage({ balances: liveBalances })

        return {
          status: results.some(({ status }) => status === "initialising") ? "initialising" : "live",
          balances: results.flatMap((result) => result.balances),
        } as BalancesResult
      }),
    )
  }

  private updateStorage({
    balances: newBalances,
    miniMetadatas: newMiniMetadatas,
  }: {
    balances?: IBalance[]
    miniMetadatas?: AnyMiniMetadata[]
  }) {
    if (!newBalances?.length || !newMiniMetadatas?.length) return

    const { balances: prevBalances, miniMetadatas: prevMiniMetadatas } = this.#storage.getValue()

    const balances = newBalances
      ? values(
          assign(
            keyBy(prevBalances, (b) => getBalanceId(b)),
            keyBy(newBalances, (b) => getBalanceId(b)),
          ),
        )
      : prevBalances

    const miniMetadatas = newMiniMetadatas
      ? values(
          assign(
            keyBy(prevMiniMetadatas, (m) => m.id),
            keyBy(newMiniMetadatas, (m) => m.id),
          ),
        )
      : prevMiniMetadatas

    this.#storage.next({
      balances,
      miniMetadatas,
    })
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
}

const getStoredBalances = (
  storedBalances: IBalance[],
  addressesByToken: Record<TokenId, Address[]>,
): IBalance[] => {
  const balanceDefs = toPairs(addressesByToken).flatMap(([tokenId, addresses]) =>
    addresses.map((address) => [tokenId, address] as [TokenId, Address]),
  )
  const balancesByKey = keyBy(storedBalances, (b) => `${b.address}:${b.tokenId}`)

  return balanceDefs
    .map(([tokenId, address]) => balancesByKey[`${address}:${tokenId}`])
    .filter(isNotNil)
}
