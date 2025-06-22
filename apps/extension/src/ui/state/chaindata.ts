import { bind, StateObservable } from "@react-rxjs/core"
import {
  Chain,
  CustomChain,
  DotNetwork,
  DotNetworkId,
  EthNetwork,
  EthNetworkId,
  NetworkId,
  NetworkOfPlatform,
  NetworkPlatform,
  Token,
  TokenId,
  TokenOfPlatform,
} from "@talismn/chaindata-provider"
import { getSharedObservable } from "@talismn/util/src/getSharedObservable"
import {
  activeNetworksStore,
  activeTokensStore,
  isNetworkActive,
  isTokenActive,
  Network,
} from "extension-core"
import { keyBy } from "lodash"
import { combineLatest, map, Observable, of, shareReplay, switchMap } from "rxjs"

import { api } from "@ui/api"

import { debugObservable } from "./util/debugObservable"

/** @deprecated */
export type AnyChain = Chain | CustomChain

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

const ALL: Required<ChaindataQueryOptions> = {
  platform: "all",
  activeOnly: false,
  includeTestnets: true,
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
    !platform || platform === "all" || item.platform === platform
const filterIncludeTestnets = (includeTestnets: boolean) => (item: { isTestnet?: boolean }) =>
  includeTestnets || !item.isTestnet

export const [useNetworks, getNetworks$] = bind((options?: ChaindataQueryOptions) => {
  // argument is an object, need to cache the output observable
  return getSharedObservable("getNetworks$", options, (opts) => {
    const { platform, activeOnly, includeTestnets } = { ...ALL, ...opts }
    const networks$ = activeOnly ? activeNetworks$ : allNetworks$
    return networks$.pipe(
      map((networks) => networks.filter(filterByPlatform(platform))),
      map((networks) => networks.filter(filterIncludeTestnets(includeTestnets))),
      debugObservable("getNetworks$"),
    )
  })
}) as [
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => NetworkOf<P>[],
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => StateObservable<NetworkOf<P>[]>,
]

export const [useNetworksMapById, getNetworksMapById$] = bind((options: ChaindataQueryOptions) => {
  return getSharedObservable("getNetworksMapById$", options, (opts) => {
    return getNetworks$(opts).pipe(map((networks) => keyBy(networks, "id")))
  })
}) as [
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => Record<NetworkId, NetworkOf<P>>,
  <P extends PlatformFilter>(
    options?: ChaindataQueryOptions<P>,
  ) => StateObservable<Record<NetworkId, NetworkOf<P>>>,
]

export const [useNetworkById, getNetworkById$] = bind((id: NetworkId | null | undefined) =>
  getNetworksMapById$().pipe(map((networksById): Network | null => networksById[id ?? ""] || null)),
) as [
  // allows forcing platform output type when calling the hook like useNetwork<"ethereum">(id)
  // TODO change this to a PlatformFilter optional arg, and actually check it
  <P extends PlatformFilter = "all">(id: NetworkId | null | undefined) => NetworkOf<P> | null,
  <P extends PlatformFilter = "all">(
    id: NetworkId | null | undefined,
  ) => StateObservable<NetworkOf<P> | null>,
]

export const [useNetworksMapByGenesisHash, getNetworksMapByGenesisHash$] = bind(
  (options?: Omit<ChaindataQueryOptions, "platform">) => {
    return getSharedObservable("getNetworksMapByGenesisHash$", options, (opts) => {
      return getNetworks$({ platform: "polkadot", ...opts }).pipe(
        map((networks) => keyBy(networks, "genesisHash")),
      )
    })
  },
)

export const [useNetworkByGenesisHash, getNetworkByGenesisHash$] = bind(
  (genesisHash: `0x${string}` | null | undefined) =>
    getNetworksMapByGenesisHash$().pipe(
      map(
        (networksByGenesisHash): DotNetwork | null =>
          networksByGenesisHash[genesisHash ?? "#"] ?? null,
      ),
    ),
)

/**
 * prefer either useNetworkById or useNetworkByGenesisHash
 * @param idOrGenesisHash
 * @returns
 */
export const useNetwork = (idOrGenesisHash: NetworkId | `0x${string}` | null | undefined) => {
  const networkById = useNetworkById(idOrGenesisHash)
  const networkByGenesisHash = useNetworkByGenesisHash(idOrGenesisHash as `0x${string}`)
  return networkById ?? networkByGenesisHash ?? null
}

export const useDotNetwork = (id: DotNetworkId | `0x${string}` | null | undefined) => {
  const network1 = useNetworkById(id)
  const network2 = useNetworkByGenesisHash(id as `0x${string}`)
  const network = network1 ?? network2
  return network?.platform === "polkadot" ? network : null
}

export const useEthNetwork = (id: EthNetworkId | null | undefined) => {
  const network = useNetworkById(id)
  return network?.platform === "ethereum" ? network : null
}

/** @deprecated */
export const useChains = (options?: Omit<ChaindataQueryOptions, "platform">) =>
  useNetworks({ platform: "polkadot", ...options })

/** @deprecated */
export const useChainsMap = (options?: Omit<ChaindataQueryOptions, "platform">) =>
  useNetworksMapById({ platform: "polkadot", ...options })

/** @deprecated */
export const useEvmNetworks = (options?: Omit<ChaindataQueryOptions, "platform">) =>
  useNetworks({ platform: "ethereum", ...options })

/** @deprecated */
export const useEvmNetworksMap = (options?: Omit<ChaindataQueryOptions, "platform">) =>
  useNetworksMapById({ platform: "ethereum", ...options })

/** @deprecated */
export const useChain = (id: NetworkId | null | undefined) => {
  const network = useNetworkById(id)
  return network?.platform === "polkadot" ? (network as DotNetwork) : null
}

/** @deprecated */
export const useChainByGenesisHash = (genesisHash: NetworkId | null | undefined) => {
  return useNetworkByGenesisHash(genesisHash as `0x${string}`)
}

/** @deprecated */
export const useEvmNetwork = (id: NetworkId | null | undefined) => {
  const network = useNetworkById(id)
  return network?.platform === "ethereum" ? (network as EthNetwork) : null
}

export const [useActiveTokensState, activeTokenState$] = bind(activeTokensStore.observable)

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
  shareReplay(1),
)

const activeTokens$ = combineLatest({
  tokens: allTokens$,
  activeNetworksById: getNetworksMapById$({ activeOnly: true, includeTestnets: true }),
  activeTokens: activeTokenState$,
}).pipe(
  map(({ tokens, activeNetworksById, activeTokens }) =>
    tokens.filter((n) => activeNetworksById[n.networkId] && isTokenActive(n, activeTokens)),
  ),
  shareReplay(1),
)

export const [useTokens, getTokens$] = bind((options?: ChaindataQueryOptions) => {
  return getSharedObservable("getTokens$", options, (opts) => {
    const { platform, activeOnly, includeTestnets } = { ...ALL, ...opts }
    const tokens$ = activeOnly ? activeTokens$ : allTokens$
    return tokens$.pipe(
      map((tokens) => tokens.filter(filterByPlatform(platform))),
      switchMap((tokens) => {
        if (includeTestnets) return of(tokens)
        return getNetworksMapById$(opts).pipe(
          map((networksById) => tokens.filter((t) => !networksById[t.networkId]?.isTestnet)),
        )
      }),
      debugObservable("getTokens$"),
    )
  })
}) as [
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => TokenOf<P>[],
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => StateObservable<TokenOf<P>[]>,
]

export const [useTokensMap, getTokensMap$] = bind((options?: ChaindataQueryOptions) => {
  return getSharedObservable("getTokensMap$", options, (opts) =>
    getTokens$(opts).pipe(map((tokens) => keyBy(tokens, "id"))),
  )
}) as [
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => Record<TokenId, TokenOf<P>>,
  <P extends PlatformFilter>(
    options?: ChaindataQueryOptions<P>,
  ) => StateObservable<Record<TokenId, TokenOf<P>>>,
]

export const [useToken, getToken$] = bind((tokenId: TokenId | null | undefined) => {
  return getTokensMap$().pipe(
    map((tokensMap): Token | null => (tokenId && tokensMap[tokenId ?? "#"]) || null),
  )
}) as [
  // allows forcing platform output type when calling the hook like useToken<"evm-erc20">(id)
  // TODO change this to a PlatformFilter optional arg, and actually check it
  <P extends PlatformFilter = "all">(id: TokenId | null | undefined) => TokenOf<P> | null,
  <P extends PlatformFilter = "all">(
    id: TokenId | null | undefined,
  ) => StateObservable<TokenOf<P> | null>,
]
