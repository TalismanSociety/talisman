import { activeNetworksStore, isNetworkActive } from "@core/domains/chaindata/store.activeNetworks"
import { activeTokensStore, isTokenActive } from "@core/domains/chaindata/store.activeTokens"
import { bind, type StateObservable } from "@react-rxjs/core"
import type {
  DotNetwork,
  DotNetworkId,
  Network,
  NetworkId,
  NetworkOfPlatform,
  NetworkPlatform,
  Token,
  TokenId,
  TokenOfPlatform,
  TokenOfType,
  TokenType,
} from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { keyBy } from "lodash-es"
import { combineLatest, map, Observable, of, shareReplay, switchMap } from "rxjs"

import { debugObservable } from "./util/debugObservable"

type PlatformFilter = NetworkPlatform | "all"

type NetworkOf<P extends PlatformFilter> = P extends NetworkPlatform
  ? NetworkOfPlatform<P>
  : Network

type TokenOf<P extends PlatformFilter> = P extends NetworkPlatform ? TokenOfPlatform<P> : Token

export type ChaindataQueryOptions<P extends PlatformFilter = "all"> = Partial<{
  platform: P
  activeOnly: boolean
  includeTestnets: boolean
}>

const toQueryArgs = (options?: ChaindataQueryOptions<PlatformFilter>) =>
  [
    options?.platform ?? "all",
    options?.activeOnly ?? false,
    options?.includeTestnets ?? true,
  ] as const

const bindChaindataQuery = <T>(
  createObservable: (options: Required<ChaindataQueryOptions<PlatformFilter>>) => Observable<T>
) => {
  const [useQuery, getQuery$] = bind(
    (platform: PlatformFilter, activeOnly: boolean, includeTestnets: boolean) =>
      createObservable({ platform, activeOnly, includeTestnets })
  )
  return [
    (options?: ChaindataQueryOptions<PlatformFilter>) => useQuery(...toQueryArgs(options)),
    (options?: ChaindataQueryOptions<PlatformFilter>) => getQuery$(...toQueryArgs(options)),
  ] as const
}

export const [useActiveNetworksState, activeNetworksState$] = bind(activeNetworksStore.observable)

const allNetworks$ = new Observable<Network[]>((subscriber) => {
  const unsubscribe = api.networks((data) => subscriber.next(data))
  return () => {
    unsubscribe()
  }
}).pipe(debugObservable("allNetworks$"), shareReplay(1))

const activeNetworks$ = combineLatest([allNetworks$, activeNetworksState$])
  .pipe(map(([networks, activeState]) => networks.filter((n) => isNetworkActive(n, activeState))))
  .pipe(shareReplay(1))

const filterByPlatform =
  <P extends PlatformFilter, T extends { platform: NetworkPlatform }>(platform: P) =>
  (item: T): boolean =>
    platform === "all" || item.platform === platform
const filterIncludeTestnets = (includeTestnets: boolean) => (item: { isTestnet?: boolean }) =>
  includeTestnets || !item.isTestnet

export const [useNetworks, getNetworks$] = bindChaindataQuery(
  ({ platform, activeOnly, includeTestnets }) => {
    const networks$ = activeOnly ? activeNetworks$ : allNetworks$
    return networks$.pipe(
      map((networks) => networks.filter(filterByPlatform(platform))),
      map((networks) => networks.filter(filterIncludeTestnets(includeTestnets))),
      debugObservable("getNetworks$")
    )
  }
) as [
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => NetworkOf<P>[],
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => StateObservable<NetworkOf<P>[]>,
]

export const [useNetworksMapById, getNetworksMapById$] = bindChaindataQuery((options) =>
  getNetworks$(options).pipe(map((networks) => keyBy(networks, (n) => n.id)))
) as [
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => Record<NetworkId, NetworkOf<P>>,
  <P extends PlatformFilter>(
    options?: ChaindataQueryOptions<P>
  ) => StateObservable<Record<NetworkId, NetworkOf<P>>>,
]

export const [useNetworkById, getNetworkById$] = bind(
  (id: NetworkId | null | undefined, platform?: NetworkPlatform) =>
    getNetworksMapById$().pipe(
      map((networksById): Network | null => {
        const network = networksById[id ?? ""] || null
        return network && (!platform || network.platform === platform) ? network : null
      })
    )
) as [
  // allows forcing platform output type when calling the hook like useNetwork<"ethereum">(id)
  // TODO change this to a PlatformFilter optional arg, and actually check it
  <
    P extends NetworkPlatform | undefined,
    R extends P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(
    id: NetworkId | null | undefined,
    platform?: P
  ) => R | null,
  <
    P extends NetworkPlatform | undefined,
    R extends P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(
    id: NetworkId | null | undefined,
    platform?: P
  ) => StateObservable<R | null>,
]

const [, networksMapByGenesisHash$] = bind(
  getNetworks$({ platform: "polkadot" }).pipe(map((networks) => keyBy(networks, "genesisHash")))
)

export const [useNetworkByGenesisHash, getNetworkByGenesisHash$] = bind(
  (genesisHash: `0x${string}` | null | undefined) =>
    networksMapByGenesisHash$.pipe(
      map(
        (networksByGenesisHash): DotNetwork | null =>
          networksByGenesisHash[genesisHash ?? "#"] ?? null
      )
    )
)

/**
 * prefer either useNetworkById or useNetworkByGenesisHash
 * @param idOrGenesisHash
 * @returns
 */
export const useAnyNetwork = (idOrGenesisHash: NetworkId | `0x${string}` | null | undefined) => {
  const networkById = useNetworkById(idOrGenesisHash)
  const networkByGenesisHash = useNetworkByGenesisHash(idOrGenesisHash as `0x${string}`)
  return networkById ?? networkByGenesisHash ?? null
}

export const useDotNetwork = (id: DotNetworkId | `0x${string}` | null | undefined) => {
  const network1 = useNetworkById(id, "polkadot")
  const network2 = useNetworkByGenesisHash(id as `0x${string}`)
  return network1 ?? network2 ?? null
}

const [useActiveTokensState, activeTokenState$] = bind(activeTokensStore.observable)

export { useActiveTokensState }

const rawTokens$ = new Observable<Token[]>((subscriber) => {
  const unsubscribe = api.tokens((data) => {
    subscriber.next(data)
  })
  return () => {
    unsubscribe()
  }
}).pipe(debugObservable("rawTokens$"), shareReplay(1))

const allTokens$ = combineLatest([rawTokens$, getNetworksMapById$()]).pipe(
  map(([tokens, networksById]) => tokens.filter((token) => networksById[token.networkId])),
  shareReplay(1)
)

const activeTokens$ = combineLatest({
  tokens: allTokens$,
  activeNetworksById: getNetworksMapById$({ activeOnly: true, includeTestnets: true }),
  activeTokens: activeTokenState$,
}).pipe(
  map(({ tokens, activeNetworksById, activeTokens }) =>
    tokens.filter((n) => activeNetworksById[n.networkId] && isTokenActive(n, activeTokens))
  ),
  shareReplay(1)
)

export const [useTokens, getTokens$] = bindChaindataQuery((options) => {
  const { platform, activeOnly, includeTestnets } = options
  const tokens$ = activeOnly ? activeTokens$ : allTokens$
  return tokens$.pipe(
    map((tokens) => tokens.filter(filterByPlatform(platform))),
    switchMap((tokens) => {
      if (includeTestnets) return of(tokens)
      return getNetworksMapById$(options).pipe(
        map((networksById) => tokens.filter((t) => !networksById[t.networkId]?.isTestnet))
      )
    }),
    debugObservable("getTokens$")
  )
}) as [
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => TokenOf<P>[],
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => StateObservable<TokenOf<P>[]>,
]

export const [useTokensMap, getTokensMap$] = bindChaindataQuery((options) =>
  getTokens$(options).pipe(map((tokens) => keyBy(tokens, (t) => t.id)))
) as [
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => Record<TokenId, TokenOf<P>>,
  <P extends PlatformFilter>(
    options?: ChaindataQueryOptions<P>
  ) => StateObservable<Record<TokenId, TokenOf<P>>>,
]

export const [useToken, getToken$] = bind(
  (tokenId: TokenId | null | undefined, type?: TokenType) => {
    return getTokensMap$().pipe(
      map((tokensMap): Token | null => {
        const token = (tokenId && tokensMap[tokenId ?? "#"]) || null
        return token && (!type || token.type === type) ? token : null
      })
    )
  }
) as [
  <T extends TokenType | undefined, R extends T extends TokenType ? TokenOfType<T> : Token>(
    id: TokenId | null | undefined,
    type?: T
  ) => R | null,
  <T extends TokenType | undefined, R extends T extends TokenType ? TokenOfType<T> : Token>(
    id: TokenId | null | undefined,
    type?: T
  ) => StateObservable<R | null>,
]
