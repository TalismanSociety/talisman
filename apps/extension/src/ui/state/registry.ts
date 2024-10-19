import { bind } from "@react-rxjs/core"
import {
  Chain,
  ChainId,
  ChainList,
  CustomChain,
  CustomEvmNetwork,
  EvmNetwork,
  EvmNetworkId,
  EvmNetworkList,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import {
  activeChainsStore,
  activeEvmNetworksStore,
  activeTokensStore,
  isChainActive,
  isEvmNetworkActive,
  isTokenActive,
} from "extension-core"
import { combineLatest, map, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"
import { chaindataProvider } from "@ui/domains/Chains/chaindataProvider"

type AnyEvmNetwork = EvmNetwork | CustomEvmNetwork
type AnyChain = Chain | CustomChain

export type ChaindataQueryOptions = {
  activeOnly: boolean
  includeTestnets: boolean
}

const DEFAULT_CHAINDATA_QUERY_OPTIONS: ChaindataQueryOptions = {
  activeOnly: false,
  includeTestnets: true,
}

const NO_OP = () => {}

const filterNoTestnet = ({ isTestnet }: { isTestnet?: boolean }) => isTestnet === false

export const [useActiveEvmNetworksState, activeEvmNetworksState$] = bind(
  activeEvmNetworksStore.observable
)

export const [useActiveChainsState, activeChainsState$] = bind(activeChainsStore.observable)

export const allEvmNetworks$ = new Observable<AnyEvmNetwork[]>((subscriber) => {
  const subData = chaindataProvider.evmNetworksObservable.subscribe(subscriber)
  const unsubscribe = api.ethereumNetworks(NO_OP)
  return () => {
    unsubscribe()
    subData.unsubscribe()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))
export const allChains$ = new Observable<AnyChain[]>((subscriber) => {
  const subData = chaindataProvider.chainsObservable.subscribe(subscriber)
  const unsubscribe = api.chains(NO_OP)
  return () => {
    unsubscribe()
    subData.unsubscribe()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

export const [useAllEvmNetworks] = bind(allEvmNetworks$)
export const [useAllChains] = bind(allChains$)

export const allEvmNetworksMap$ = allEvmNetworks$.pipe(
  map(
    (evmNetworks) =>
      Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)
export const allChainsMap$ = allChains$.pipe(
  map((chains) => Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList),
  shareReplay({ bufferSize: 1, refCount: true })
)
export const allChainsByGenesisHash$ = allChains$.pipe(
  map(
    (chains) =>
      Object.fromEntries(
        chains
          .filter((network) => network.genesisHash)
          .map((network) => [network.genesisHash, network])
      ) as ChainList
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)

export const [useAllEvmNetworksMap] = bind(allEvmNetworksMap$)
export const [useAllChainsMap] = bind(allChainsMap$)
export const [useAllChainsMapByGenesisHash] = bind(allChainsByGenesisHash$)

const allEvmNetworksWithoutTestnets$ = allEvmNetworks$.pipe(
  map((evmNetworks) => evmNetworks.filter(filterNoTestnet)),
  shareReplay({ bufferSize: 1, refCount: true })
)
const allChainsWithoutTestnets$ = allChains$.pipe(
  map((chains) => chains.filter(filterNoTestnet)),
  shareReplay({ bufferSize: 1, refCount: true })
)

const allEvmNetworksWithoutTestnetsMap$ = allEvmNetworksWithoutTestnets$.pipe(
  map(
    (evmNetworks) =>
      Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)
const allChainsWithoutTestnetsMap$ = allChainsWithoutTestnets$.pipe(
  map((chains) => Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList),
  shareReplay({ bufferSize: 1, refCount: true })
)

const activeEvmNetworksWithTestnets$ = combineLatest([
  allEvmNetworks$,
  activeEvmNetworksState$,
]).pipe(
  map(([evmNetworks, activeNetworks]) =>
    evmNetworks.filter((network) => isEvmNetworkActive(network, activeNetworks))
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)
const activeChainsWithTestnets$ = combineLatest([allChains$, activeChainsState$]).pipe(
  map(([chains, activeChains]) => chains.filter((network) => isChainActive(network, activeChains))),
  shareReplay({ bufferSize: 1, refCount: true })
)

// TODO don't export
export const activeEvmNetworksWithTestnetsMap$ = activeEvmNetworksWithTestnets$.pipe(
  map(
    (evmNetworks) =>
      Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)
export const activeChainsWithTestnetsMap$ = activeChainsWithTestnets$.pipe(
  map((chains) => Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList),
  shareReplay({ bufferSize: 1, refCount: true })
)

const activeEvmNetworksWithoutTestnets$ = activeEvmNetworksWithTestnets$.pipe(
  map((evmNetworks) => evmNetworks.filter(filterNoTestnet)),
  shareReplay({ bufferSize: 1, refCount: true })
)
const activeChainsWithoutTestnets$ = activeChainsWithTestnets$.pipe(
  map((chains) => chains.filter(filterNoTestnet)),
  shareReplay({ bufferSize: 1, refCount: true })
)

// TODO don't export
export const activeEvmNetworksWithoutTestnetsMap$ = activeEvmNetworksWithoutTestnets$.pipe(
  map(
    (evmNetworks) =>
      Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)
export const activeChainsWithoutTestnetsMap$ = activeChainsWithoutTestnets$.pipe(
  map((chains) => Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList),
  shareReplay({ bufferSize: 1, refCount: true })
)

export const getEvmNetworks$ = ({
  activeOnly,
  includeTestnets,
}: ChaindataQueryOptions = DEFAULT_CHAINDATA_QUERY_OPTIONS) => {
  if (activeOnly)
    return includeTestnets ? activeEvmNetworksWithTestnets$ : activeEvmNetworksWithoutTestnets$
  return includeTestnets ? allEvmNetworks$ : allEvmNetworksWithoutTestnets$
}
export const getChains$ = ({
  activeOnly,
  includeTestnets,
}: ChaindataQueryOptions = DEFAULT_CHAINDATA_QUERY_OPTIONS) => {
  if (activeOnly) return includeTestnets ? activeChainsWithTestnets$ : activeChainsWithoutTestnets$
  return includeTestnets ? allChains$ : allChainsWithoutTestnets$
}

export const getEvmNetworksMap$ = ({
  activeOnly,
  includeTestnets,
}: ChaindataQueryOptions = DEFAULT_CHAINDATA_QUERY_OPTIONS) => {
  if (activeOnly)
    return includeTestnets
      ? activeEvmNetworksWithTestnetsMap$
      : activeEvmNetworksWithoutTestnetsMap$
  return includeTestnets ? allEvmNetworksMap$ : allEvmNetworksWithoutTestnetsMap$
}
export const getChainsMap$ = ({
  activeOnly,
  includeTestnets,
}: ChaindataQueryOptions = DEFAULT_CHAINDATA_QUERY_OPTIONS) => {
  if (activeOnly)
    return includeTestnets ? activeChainsWithTestnetsMap$ : activeChainsWithoutTestnetsMap$
  return includeTestnets ? allChainsMap$ : allChainsWithoutTestnetsMap$
}

export const getEvmNetwork$ = (evmNetworkId: EvmNetworkId | null | undefined) => {
  return allEvmNetworksMap$.pipe(
    map((evmNetworksMap) => evmNetworksMap[evmNetworkId ?? "#"] ?? null),
    shareReplay({ bufferSize: 1, refCount: true })
  )
}
export const getChain$ = (chainId: ChainId | null | undefined) => {
  return allChainsMap$.pipe(
    map((chainsMap) => chainsMap[chainId ?? "#"] ?? null),
    shareReplay({ bufferSize: 1, refCount: true })
  )
}
export const getChainByGenesisHash$ = (genesisHash: string | null | undefined) => {
  return allChainsByGenesisHash$.pipe(
    map((chainsMap) => chainsMap[genesisHash ?? "#"] ?? null),
    shareReplay({ bufferSize: 1, refCount: true })
  )
}

// export const tokensActive$ = activeTokensStore.observable.pipe(
//   shareReplay({ bufferSize: 1, refCount: true })
// )

export const [useActiveTokensState, activeTokenState$] = bind(activeTokensStore.observable)

const allTokensUnsafe$ = new Observable<Token[]>((subscriber) => {
  const subData = chaindataProvider.tokensObservable.subscribe(subscriber)
  const unsubscribe = api.tokens(NO_OP)
  return () => {
    unsubscribe()
    subData.unsubscribe()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

export const allTokens$ = combineLatest([allTokensUnsafe$, allEvmNetworksMap$, allChainsMap$]).pipe(
  map(([tokens, evmNetworksMap, chainsMap]) =>
    tokens.filter(
      (token) => chainsMap[token.chain?.id ?? "#"] || evmNetworksMap[token.evmNetwork?.id ?? "#"]
    )
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)

export const [useAllTokens] = bind(allTokens$)

export const allTokensMap$ = allTokensUnsafe$.pipe(
  map((tokens) => Object.fromEntries(tokens.map((token) => [token.id, token]))),
  shareReplay({ bufferSize: 1, refCount: true })
)

export const [useAllTokensMap] = bind(allTokensMap$)

const allTokensWithoutTestnets$ = combineLatest([
  allTokensUnsafe$,
  allEvmNetworksWithoutTestnetsMap$,
  allChainsWithoutTestnetsMap$,
]).pipe(
  map(([tokens, evmNetworksMap, chainsMap]) =>
    tokens.filter(
      (token) =>
        !token.isTestnet &&
        (chainsMap[token.chain?.id ?? "#"] || evmNetworksMap[token.evmNetwork?.id ?? "#"])
    )
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)

const allTokensWithoutTestnetsMap$ = allTokensWithoutTestnets$.pipe(
  map((tokens) => Object.fromEntries(tokens.map((token) => [token.id, token]))),
  shareReplay({ bufferSize: 1, refCount: true })
)

const activeTokensWithTestnets$ = combineLatest([
  allTokensUnsafe$,
  activeEvmNetworksWithTestnetsMap$,
  activeChainsWithTestnetsMap$,
  activeTokenState$,
]).pipe(
  map(([tokens, evmNetworksMap, chainsMap, activeTokens]) =>
    tokens.filter(
      (token) =>
        (chainsMap[token.chain?.id ?? "#"] || evmNetworksMap[token.evmNetwork?.id ?? "#"]) &&
        isTokenActive(token, activeTokens)
    )
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)

// todo remove export
export const activeTokensWithTestnetsMap$ = activeTokensWithTestnets$.pipe(
  map((tokens) => Object.fromEntries(tokens.map((token) => [token.id, token]))),
  shareReplay({ bufferSize: 1, refCount: true })
)

const activeTokensWithoutTestnets$ = combineLatest([
  activeTokensWithTestnets$,
  activeChainsWithoutTestnetsMap$,
  activeEvmNetworksWithoutTestnetsMap$,
]).pipe(
  map(([tokens, chainsMap, evmNetworksMap]) =>
    tokens.filter(
      (token) =>
        !token.isTestnet &&
        (chainsMap[token.chain?.id ?? "#"] || evmNetworksMap[token.evmNetwork?.id ?? "#"])
    )
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)

const activeTokensWithoutTestnetsMap$ = activeTokensWithoutTestnets$.pipe(
  map((tokens) => Object.fromEntries(tokens.map((token) => [token.id, token]))),
  shareReplay({ bufferSize: 1, refCount: true })
)

export const [useTokens, getTokens$] = bind(
  ({ activeOnly, includeTestnets }: ChaindataQueryOptions = DEFAULT_CHAINDATA_QUERY_OPTIONS) => {
    if (activeOnly)
      return includeTestnets ? activeTokensWithTestnets$ : activeTokensWithoutTestnets$
    return includeTestnets ? allTokens$ : allTokensWithoutTestnets$
  }
)

export const [useTokensMap, getTokensMap$] = bind(
  ({ activeOnly, includeTestnets }: ChaindataQueryOptions = DEFAULT_CHAINDATA_QUERY_OPTIONS) => {
    if (activeOnly)
      return includeTestnets ? activeTokensWithTestnetsMap$ : activeTokensWithoutTestnetsMap$
    return includeTestnets ? allTokensMap$ : allTokensWithoutTestnetsMap$
  }
)

export const [useToken, getToken$] = bind((tokenId: TokenId | null | undefined) => {
  return allTokensMap$.pipe(
    map((tokensMap) => tokensMap[tokenId ?? "#"] ?? null),
    shareReplay({ bufferSize: 1, refCount: true })
  )
})
