import { bind, StateObservable } from "@react-rxjs/core"
import {
  Chain,
  CustomChain,
  DotNetwork,
  DotNetworkId,
  EthNetwork,
  EthNetworkId,
  NetworkId,
  NetworkPlatform,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import {
  activeNetworksStore,
  activeTokensStore,
  isNetworkActive,
  isTokenActive,
  Network,
} from "extension-core"
import { DEBUG } from "extension-shared"
import { keyBy } from "lodash"
import { combineLatest, map, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

import { debugObservable } from "./util/debugObservable"
import { getSharedObservable } from "./util/getSharedObservable"

/** @deprecated */
export type AnyChain = Chain | CustomChain

type PlatformFilter = NetworkPlatform | "all"

type NetworkOfPlatform<P extends PlatformFilter> = P extends "ethereum"
  ? EthNetwork
  : P extends "polkadot"
    ? DotNetwork
    : Network

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
}).pipe(debugObservable("allNetworks$", DEBUG), shareReplay(1))

const activeNetworks$ = combineLatest([allNetworks$, activeNetworksState$])
  .pipe(map(([networks, activeState]) => networks.filter((n) => isNetworkActive(n, activeState))))
  .pipe(shareReplay(1))

const filterByPlatform =
  <P extends PlatformFilter>(platform: P) =>
  (item: { platform: NetworkPlatform }): item is NetworkOfPlatform<P> =>
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
      debugObservable("getNetworks$", DEBUG),
    )
  })
}) as [
  <P extends PlatformFilter>(options?: ChaindataQueryOptions<P>) => NetworkOfPlatform<P>[],
  <P extends PlatformFilter>(
    options?: ChaindataQueryOptions<P>,
  ) => StateObservable<NetworkOfPlatform<P>[]>,
]

export const [useNetworksMapById, getNetworksMapById$] = bind((options: ChaindataQueryOptions) => {
  return getSharedObservable("getNetworksMapById$", options, (opts) => {
    return getNetworks$(opts).pipe(map((networks) => keyBy(networks, "id")))
  })
}) as [
  <P extends PlatformFilter>(
    options?: ChaindataQueryOptions<P>,
  ) => Record<NetworkId, NetworkOfPlatform<P>>,
  <P extends PlatformFilter>(
    options?: ChaindataQueryOptions<P>,
  ) => StateObservable<Record<NetworkId, NetworkOfPlatform<P>>>,
]

export const [useNetworkById, getNetworkById$] = bind((id: NetworkId | null | undefined) =>
  getNetworksMapById$().pipe(map((networksById): Network | null => networksById[id ?? ""] || null)),
) as [
  <P extends PlatformFilter = "all">(
    id: NetworkId | null | undefined,
  ) => NetworkOfPlatform<P> | null,
  <P extends PlatformFilter = "all">(
    id: NetworkId | null | undefined,
  ) => StateObservable<NetworkOfPlatform<P> | null>,
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
}).pipe(debugObservable("rawTokens$", DEBUG), shareReplay(1))

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
      map((tokens) => tokens.filter(filterIncludeTestnets(includeTestnets))),
      debugObservable("getTokens$", DEBUG),
    )
  })
})

export const [useTokensMap, getTokensMap$] = bind((options?: ChaindataQueryOptions) => {
  return getSharedObservable("getTokensMap$", options, (opts) =>
    getTokens$(opts).pipe(map((tokens) => keyBy(tokens, "id"))),
  )
})

export const [useToken, getToken$] = bind((tokenId: TokenId | null | undefined) => {
  return getTokensMap$().pipe(
    map((tokensMap): Token | null => (tokenId && tokensMap[tokenId ?? "#"]) || null),
  )
})
