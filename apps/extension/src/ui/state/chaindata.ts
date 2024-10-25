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
  TokenList,
} from "@talismn/chaindata-provider"
import {
  activeChainsStore,
  activeEvmNetworksStore,
  activeTokensStore,
  isChainActive,
  isEvmNetworkActive,
  isTokenActive,
} from "extension-core"
import { isEqual } from "lodash"
import { combineLatest, distinctUntilChanged, map, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"
import { chaindataProvider } from "@ui/domains/Chains/chaindataProvider"

import { debugObservable } from "./util/debugObservable"

type AnyEvmNetwork = EvmNetwork | CustomEvmNetwork
type AnyChain = Chain | CustomChain

export type ChaindataQueryOptions = {
  activeOnly: boolean
  includeTestnets: boolean
}

const ALL: ChaindataQueryOptions = {
  activeOnly: false,
  includeTestnets: true,
}

const NO_OP = () => {}

const filterNoTestnet = ({ isTestnet }: { isTestnet?: boolean }) => isTestnet === false

export const [useActiveEvmNetworksState, activeEvmNetworksState$] = bind(
  activeEvmNetworksStore.observable,
)

export const [useActiveChainsState, activeChainsState$] = bind(activeChainsStore.observable)

const allEvmNetworks$ = new Observable<AnyEvmNetwork[]>((subscriber) => {
  const subData = chaindataProvider.evmNetworksObservable
    .pipe(distinctUntilChanged<AnyEvmNetwork[]>(isEqual))
    .subscribe((data) => {
      subscriber.next(data)
    })
  const unsubscribe = api.ethereumNetworks(NO_OP) // keeps provider up to date from chaindata
  return () => {
    unsubscribe()
    subData.unsubscribe()
  }
}).pipe(debugObservable("allEvmNetworks$"), shareReplay(1))

const allChains$ = new Observable<AnyChain[]>((subscriber) => {
  const subData = chaindataProvider.chainsObservable
    .pipe(distinctUntilChanged<AnyChain[]>(isEqual))
    .subscribe((data) => {
      subscriber.next(data)
    })
  const unsubscribe = api.chains(NO_OP) // keeps provider up to date from chaindata
  return () => {
    unsubscribe()
    subData.unsubscribe()
  }
}).pipe(debugObservable("allChains$"), shareReplay(1))

const allEvmNetworksMap$ = allEvmNetworks$.pipe(
  map(
    (evmNetworks) =>
      Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList,
  ),
  shareReplay(1),
)

const allChainsMap$ = allChains$.pipe(
  map((chains) => Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList),
  shareReplay(1),
)

const allEvmNetworksWithoutTestnets$ = allEvmNetworks$.pipe(
  map((evmNetworks) => evmNetworks.filter(filterNoTestnet)),
  shareReplay(1),
)

const allChainsWithoutTestnets$ = allChains$.pipe(
  map((chains) => chains.filter(filterNoTestnet)),
  shareReplay(1),
)

const allEvmNetworksWithoutTestnetsMap$ = allEvmNetworksWithoutTestnets$.pipe(
  map(
    (evmNetworks) =>
      Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList,
  ),
  shareReplay(1),
)
const allChainsWithoutTestnetsMap$ = allChainsWithoutTestnets$.pipe(
  map((chains) => Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList),
  shareReplay(1),
)

const activeEvmNetworksWithTestnets$ = combineLatest([
  allEvmNetworks$,
  activeEvmNetworksState$,
]).pipe(
  map(([evmNetworks, activeNetworks]) =>
    evmNetworks.filter((network) => isEvmNetworkActive(network, activeNetworks)),
  ),
  shareReplay(1),
)

const activeChainsWithTestnets$ = combineLatest([allChains$, activeChainsState$]).pipe(
  map(([chains, activeChains]) => chains.filter((network) => isChainActive(network, activeChains))),
  shareReplay(1),
)

const activeEvmNetworksWithTestnetsMap$ = activeEvmNetworksWithTestnets$.pipe(
  map(
    (evmNetworks) =>
      Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList,
  ),
  shareReplay(1),
)

const activeChainsWithTestnetsMap$ = activeChainsWithTestnets$.pipe(
  map((chains) => Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList),
  shareReplay(1),
)

const activeEvmNetworksWithoutTestnets$ = activeEvmNetworksWithTestnets$.pipe(
  map((evmNetworks) => evmNetworks.filter(filterNoTestnet)),
  shareReplay(1),
)

const activeChainsWithoutTestnets$ = activeChainsWithTestnets$.pipe(
  map((chains) => chains.filter(filterNoTestnet)),
  shareReplay(1),
)

const activeEvmNetworksWithoutTestnetsMap$ = activeEvmNetworksWithoutTestnets$.pipe(
  map(
    (evmNetworks) =>
      Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList,
  ),
  shareReplay(1),
)

const activeChainsWithoutTestnetsMap$ = activeChainsWithoutTestnets$.pipe(
  map((chains) => Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList),
  shareReplay(1),
)

export const [useEvmNetworks, getEvmNetworks$] = bind(
  ({ activeOnly, includeTestnets }: ChaindataQueryOptions = ALL) => {
    if (activeOnly)
      return includeTestnets ? activeEvmNetworksWithTestnets$ : activeEvmNetworksWithoutTestnets$
    return includeTestnets ? allEvmNetworks$ : allEvmNetworksWithoutTestnets$
  },
)
export const [useChains, getChains$] = bind(
  ({ activeOnly, includeTestnets }: ChaindataQueryOptions = ALL) => {
    if (activeOnly)
      return includeTestnets ? activeChainsWithTestnets$ : activeChainsWithoutTestnets$
    return includeTestnets ? allChains$ : allChainsWithoutTestnets$
  },
)

export const [useEvmNetworksMap, getEvmNetworksMap$] = bind(
  ({ activeOnly, includeTestnets }: ChaindataQueryOptions = ALL) => {
    if (activeOnly)
      return includeTestnets
        ? activeEvmNetworksWithTestnetsMap$
        : activeEvmNetworksWithoutTestnetsMap$
    return includeTestnets ? allEvmNetworksMap$ : allEvmNetworksWithoutTestnetsMap$
  },
)

export const [useChainsMap, getChainsMap$] = bind(
  ({ activeOnly, includeTestnets }: ChaindataQueryOptions = ALL) => {
    if (activeOnly)
      return includeTestnets ? activeChainsWithTestnetsMap$ : activeChainsWithoutTestnetsMap$
    return includeTestnets ? allChainsMap$ : allChainsWithoutTestnetsMap$
  },
)

export const [useChainsMapByGenesisHash, allChainsByGenesisHash$] = bind(
  allChains$.pipe(
    map(
      (chains) =>
        Object.fromEntries(
          chains
            .filter((network) => network.genesisHash)
            .map((network) => [network.genesisHash, network]),
        ) as ChainList,
    ),
  ),
)

export const [useEvmNetwork, getEvmNetwork$] = bind(
  (evmNetworkId: EvmNetworkId | null | undefined) =>
    allEvmNetworksMap$.pipe(
      map((evmNetworksMap) => (evmNetworkId && evmNetworksMap[evmNetworkId ?? "#"]) || null),
    ),
)

export const [useChain, getChain$] = bind((chainId: ChainId | null | undefined) =>
  allChainsMap$.pipe(map((chainsMap) => (chainId && chainsMap[chainId ?? "#"]) || null)),
)

export const [useChainByGenesisHash, getChainByGenesisHash$] = bind(
  (genesisHash: string | null | undefined) =>
    allChainsByGenesisHash$.pipe(
      map((chainsMap) => (genesisHash && chainsMap[genesisHash ?? "#"]) || null),
    ),
)

export const [useActiveTokensState, activeTokenState$] = bind(activeTokensStore.observable)

const rawTokens$ = new Observable<Token[]>((subscriber) => {
  const subData = chaindataProvider.tokensObservable
    .pipe(distinctUntilChanged<Token[]>(isEqual))
    .subscribe((data) => {
      subscriber.next(data)
    })
  const unsubscribe = api.tokens(NO_OP)
  return () => {
    unsubscribe()
    subData.unsubscribe()
  }
}).pipe(debugObservable("rawTokens$"), shareReplay(1))

const allTokens$ = combineLatest([rawTokens$, allEvmNetworksMap$, allChainsMap$]).pipe(
  map(([tokens, evmNetworksMap, chainsMap]) =>
    tokens.filter(
      (token) => chainsMap[token.chain?.id ?? "#"] || evmNetworksMap[token.evmNetwork?.id ?? "#"],
    ),
  ),
  shareReplay(1),
)

const allTokensMap$ = rawTokens$.pipe(
  map((tokens) => Object.fromEntries(tokens.map((token) => [token.id, token]))),
  shareReplay(1),
)

const allTokensWithoutTestnets$ = combineLatest([
  rawTokens$,
  allEvmNetworksWithoutTestnetsMap$,
  allChainsWithoutTestnetsMap$,
]).pipe(
  map(([tokens, evmNetworksMap, chainsMap]) =>
    tokens.filter(
      (token) =>
        !token.isTestnet &&
        (chainsMap[token.chain?.id ?? "#"] || evmNetworksMap[token.evmNetwork?.id ?? "#"]),
    ),
  ),
  shareReplay(1),
)

const allTokensWithoutTestnetsMap$ = allTokensWithoutTestnets$.pipe(
  map((tokens) => Object.fromEntries(tokens.map((token) => [token.id, token]))),
  shareReplay(1),
)

const activeTokensWithTestnets$ = combineLatest([
  rawTokens$,
  activeEvmNetworksWithTestnetsMap$,
  activeChainsWithTestnetsMap$,
  activeTokenState$,
]).pipe(
  map(([tokens, evmNetworksMap, chainsMap, activeTokens]) =>
    tokens.filter(
      (token) =>
        (chainsMap[token.chain?.id ?? "#"] || evmNetworksMap[token.evmNetwork?.id ?? "#"]) &&
        isTokenActive(token, activeTokens),
    ),
  ),
  shareReplay(1),
)

const activeTokensWithTestnetsMap$ = activeTokensWithTestnets$.pipe(
  map((tokens) => Object.fromEntries(tokens.map((token) => [token.id, token])) as TokenList),
  shareReplay(1),
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
        (chainsMap[token.chain?.id ?? "#"] || evmNetworksMap[token.evmNetwork?.id ?? "#"]),
    ),
  ),
  shareReplay(1),
)

const activeTokensWithoutTestnetsMap$ = activeTokensWithoutTestnets$.pipe(
  map((tokens) => Object.fromEntries(tokens.map((token) => [token.id, token])) as TokenList),
  shareReplay(1),
)

export const [useTokens, getTokens$] = bind(
  ({ activeOnly, includeTestnets }: ChaindataQueryOptions = ALL) => {
    if (activeOnly)
      return includeTestnets ? activeTokensWithTestnets$ : activeTokensWithoutTestnets$
    return includeTestnets ? allTokens$ : allTokensWithoutTestnets$
  },
)

export const [useTokensMap, getTokensMap$] = bind(
  ({ activeOnly, includeTestnets }: ChaindataQueryOptions = ALL) => {
    if (activeOnly)
      return includeTestnets ? activeTokensWithTestnetsMap$ : activeTokensWithoutTestnetsMap$
    return includeTestnets ? allTokensMap$ : allTokensWithoutTestnetsMap$
  },
)

export const [useToken, getToken$] = bind((tokenId: TokenId | null | undefined) => {
  return allTokensMap$.pipe(map((tokensMap) => (tokenId && tokensMap[tokenId ?? "#"]) || null))
})
