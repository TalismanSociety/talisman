import {
  ActiveChains,
  activeChainsStore,
  isChainActive,
} from "@core/domains/chains/store.activeChains"
import {
  ActiveEvmNetworks,
  activeEvmNetworksStore,
  isEvmNetworkActive,
} from "@core/domains/ethereum/store.activeEvmNetworks"
import {
  ActiveTokens,
  activeTokensStore,
  isTokenActive,
} from "@core/domains/tokens/store.activeTokens"
import { log } from "@core/log"
import { chaindataProvider } from "@core/rpcs/chaindata"
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
import { api } from "@ui/api"
import { atom, selector, selectorFamily, waitForAll } from "recoil"

const NO_OP = () => {}

const filterNoTestnet = ({ isTestnet }: { isTestnet?: boolean }) => isTestnet === false

export const evmNetworksActiveState = atom<ActiveEvmNetworks>({
  key: "evmNetworksActiveState",
  effects: [
    ({ setSelf }) => {
      log.debug("evmNetworksActiveState.init")
      const sub = activeEvmNetworksStore.observable.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
  ],
})

export const allEvmNetworksState = atom<(EvmNetwork | CustomEvmNetwork)[]>({
  key: "allEvmNetworksState",
  effects: [
    ({ setSelf }) => {
      log.debug("allEvmNetworksState.init")
      const sub = chaindataProvider.evmNetworksObservable.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
    () => api.ethereumNetworks(NO_OP),
  ],
})

export const allEvmNetworksMapState = selector<EvmNetworkList>({
  key: "allEvmNetworksMapState",
  get: ({ get }) => {
    const evmNetworks = get(allEvmNetworksState)
    return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
  },
})

export const allEvmNetworksWithoutTestnetsState = selector<(EvmNetwork | CustomEvmNetwork)[]>({
  key: "allEvmNetworksWithoutTestnetsState",
  get: ({ get }) => {
    const evmNetworks = get(allEvmNetworksState)
    return evmNetworks.filter(filterNoTestnet)
  },
})

export const allEvmNetworksWithoutTestnetsMapState = selector<EvmNetworkList>({
  key: "allEvmNetworksWithoutTestnetsMapState",
  get: ({ get }) => {
    const evmNetworks = get(allEvmNetworksWithoutTestnetsState)
    return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
  },
})

export const activeEvmNetworksWithTestnetsState = selector({
  key: "activeEvmNetworksWithTestnetsState",
  get: ({ get }) => {
    const [evmNetworks, activeNetworks] = get(
      waitForAll([allEvmNetworksState, evmNetworksActiveState])
    )

    // return only active networks
    return evmNetworks.filter((network) => isEvmNetworkActive(network, activeNetworks))
  },
})

export const activeEvmNetworksWithTestnetsMapState = selector<EvmNetworkList>({
  key: "activeEvmNetworksWithTestnetsMapState",
  get: ({ get }) => {
    const evmNetworks = get(activeEvmNetworksWithTestnetsState)
    return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
  },
})

export const activeEvmNetworksWithoutTestnetsState = selector({
  key: "activeEvmNetworksWithoutTestnetsState",
  get: ({ get }) => {
    const evmNetworks = get(activeEvmNetworksWithTestnetsState)
    return evmNetworks.filter(filterNoTestnet)
  },
})

export const activeEvmNetworksWithoutTestnetsMapState = selector<EvmNetworkList>({
  key: "activeEvmNetworksWithoutTestnetsMapState",
  get: ({ get }) => {
    const evmNetworks = get(activeEvmNetworksWithoutTestnetsState)
    return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
  },
})

export type EvmNetworksQueryOptions = {
  activeOnly: boolean
  includeTestnets: boolean
}

export const evmNetworksArrayQuery = selectorFamily({
  key: "evmNetworksArrayQuery",
  get:
    ({ activeOnly, includeTestnets }: EvmNetworksQueryOptions) =>
    ({ get }) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeEvmNetworksWithTestnetsState)
          : get(activeEvmNetworksWithoutTestnetsState)

      return includeTestnets ? get(allEvmNetworksState) : get(allEvmNetworksWithoutTestnetsState)
    },
})

export const evmNetworksMapQuery = selectorFamily({
  key: "evmNetworksMapQuery",
  get:
    ({ activeOnly, includeTestnets }: EvmNetworksQueryOptions) =>
    ({ get }) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeEvmNetworksWithTestnetsMapState)
          : get(activeEvmNetworksWithoutTestnetsMapState)

      return includeTestnets
        ? get(allEvmNetworksMapState)
        : get(allEvmNetworksWithoutTestnetsMapState)
    },
})

export const evmNetworkQuery = selectorFamily({
  key: "evmNetworkQuery",
  get:
    (evmNetworkId: EvmNetworkId | null | undefined) =>
    ({ get }) => {
      const evmNetworks = get(allEvmNetworksMapState)
      return evmNetworkId ? evmNetworks[evmNetworkId] : undefined
    },
})

export const chainsActiveState = atom<ActiveChains>({
  key: "chainsActiveState",
  effects: [
    ({ setSelf }) => {
      log.debug("chainsActiveState.init")
      const sub = activeChainsStore.observable.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
  ],
})

export const allChainsState = atom<(Chain | CustomChain)[]>({
  key: "allChainsState",
  effects: [
    ({ setSelf }) => {
      log.debug("allChainsState.init")
      const sub = chaindataProvider.chainsObservable.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
    () => api.chains(NO_OP),
  ],
})

export const allChainsMapState = selector<ChainList>({
  key: "allChainsMapState",
  get: ({ get }) => {
    const chains = get(allChainsState)
    return Object.fromEntries(chains.map((network) => [network.id, network]))
  },
})

export const allChainsWithoutTestnetsState = selector({
  key: "allChainsWithoutTestnetsState",
  get: ({ get }) => {
    const chains = get(allChainsState)
    return chains.filter(filterNoTestnet)
  },
})

export const allChainsWithoutTestnetsMapState = selector<ChainList>({
  key: "allChainsWithoutTestnetsMapState",
  get: ({ get }) => {
    const chains = get(allChainsWithoutTestnetsState)
    return Object.fromEntries(chains.map((network) => [network.id, network]))
  },
})

export const activeChainsWithTestnetsState = selector({
  key: "activeChainsWithTestnetsState",
  get: ({ get }) => {
    const [chains, activeChains] = get(waitForAll([allChainsState, chainsActiveState]))
    return chains.filter((network) => isChainActive(network, activeChains))
  },
})

export const activeChainsWithTestnetsMapState = selector<ChainList>({
  key: "activeChainsWithTestnetsMapState",
  get: ({ get }) => {
    const chains = get(activeChainsWithTestnetsState)
    return Object.fromEntries(chains.map((network) => [network.id, network]))
  },
})

export const activeChainsWithoutTestnetsState = selector({
  key: "activeChainsWithoutTestnetsState",
  get: ({ get }) => {
    const chains = get(activeChainsWithTestnetsState)
    return chains.filter(filterNoTestnet)
  },
})

export const activeChainsWithoutTestnetsMapState = selector<ChainList>({
  key: "activeChainsWithoutTestnetsMapState",
  get: ({ get }) => {
    const chains = get(activeChainsWithoutTestnetsState)
    return Object.fromEntries(chains.map((network) => [network.id, network]))
  },
})

const chainsByGenesisHashMapState = selector({
  key: "chainsByGenesisHashMapState",
  get: ({ get }) => {
    const chains = get(allChainsState)
    return Object.fromEntries(chains.map((chain) => [chain.genesisHash, chain])) as Record<
      string,
      Chain | CustomChain
    >
  },
})

export const chainByGenesisHashQuery = selectorFamily({
  key: "chainByGenesisHashQuery",
  get:
    (genesisHash: string | null | undefined) =>
    ({ get }) => {
      const chains = get(chainsByGenesisHashMapState)
      return genesisHash ? chains[genesisHash] : undefined
    },
})

export type ChainsQueryOptions = {
  activeOnly: boolean
  includeTestnets: boolean
}

export const chainsArrayQuery = selectorFamily({
  key: "chainsArrayQuery",
  get:
    ({ activeOnly, includeTestnets }: ChainsQueryOptions) =>
    ({ get }) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeChainsWithTestnetsState)
          : get(activeChainsWithoutTestnetsState)

      return includeTestnets ? get(allChainsState) : get(allChainsWithoutTestnetsState)
    },
})

export const chainsMapQuery = selectorFamily({
  key: "chainsMapQuery",
  get:
    ({ activeOnly, includeTestnets }: ChainsQueryOptions) =>
    ({ get }) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeChainsWithTestnetsMapState)
          : get(activeChainsWithoutTestnetsMapState)

      return includeTestnets ? get(allChainsMapState) : get(allChainsWithoutTestnetsMapState)
    },
})

export const chainQuery = selectorFamily({
  key: "chainQuery",
  get:
    (chainId: ChainId | null | undefined) =>
    ({ get }) => {
      const chains = get(allChainsMapState)
      return chainId ? chains[chainId] : undefined
    },
})

export const tokensActiveState = atom<ActiveTokens>({
  key: "tokensActiveState",
  effects: [
    ({ setSelf }) => {
      log.debug("tokensActiveState.init")
      const sub = activeTokensStore.observable.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
  ],
})

export const allTokensMapState = atom<TokenList>({
  key: "allTokensMapState",
  effects: [
    ({ setSelf }) => {
      log.debug("allTokensMapState.init")
      const sub = chaindataProvider.tokensByIdObservable.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
    () => api.tokens(NO_OP),
  ],
})

export const allTokensState = selector<Token[]>({
  key: "allTokensState",
  get: ({ get }) => {
    const [tokensMap, chainsMap, evmNetworksMap] = get(
      waitForAll([allTokensMapState, allChainsMapState, allEvmNetworksMapState])
    )
    return Object.values(tokensMap).filter(
      (token) =>
        (token.chain && chainsMap[token.chain.id]) ||
        (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
    )
  },
})

export const allTokensWithoutTestnetsState = selector<Token[]>({
  key: "allTokensWithoutTestnetsState",
  get: ({ get }) => {
    const [tokensMap, chainsMap, evmNetworksMap] = get(
      waitForAll([
        allTokensMapState,
        allChainsWithoutTestnetsMapState,
        allEvmNetworksWithoutTestnetsMapState,
      ])
    )
    return Object.values(tokensMap)
      .filter(filterNoTestnet)
      .filter(
        (token) =>
          (token.chain && chainsMap[token.chain.id]) ||
          (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
      )
  },
})

export const allTokensWithoutTestnetsMapState = selector<TokenList>({
  key: "allTokensWithoutTestnetsMapState",
  get: ({ get }) => {
    const tokens = get(allTokensWithoutTestnetsState)
    return Object.fromEntries(tokens.map((token) => [token.id, token]))
  },
})

export const activeTokensWithTestnetsState = selector<Token[]>({
  key: "activeTokensWithTestnetsState",
  get: ({ get }) => {
    const [tokens, chainsMap, evmNetworksMap, activeTokens] = get(
      waitForAll([
        allTokensState,
        activeChainsWithTestnetsMapState,
        activeEvmNetworksWithTestnetsMapState,
        tokensActiveState,
      ])
    )
    return tokens.filter(
      (token) =>
        ((token.chain && chainsMap[token.chain.id]) ||
          (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])) &&
        isTokenActive(token, activeTokens)
    )
  },
})

export const activeTokensWithoutTestnetsState = selector<Token[]>({
  key: "activeTokensWithoutTestnetsState",
  get: ({ get }) => {
    const [arTokensWithTestnets, chainsWithoutTestnetsMap, evmNetworksWithoutTestnetsMap] = get(
      waitForAll([
        activeTokensWithTestnetsState,
        activeChainsWithoutTestnetsMapState,
        activeEvmNetworksWithoutTestnetsMapState,
      ])
    )
    return arTokensWithTestnets
      .filter(filterNoTestnet)
      .filter(
        (token) =>
          (token.chain && chainsWithoutTestnetsMap[token.chain.id]) ||
          (token.evmNetwork && evmNetworksWithoutTestnetsMap[token.evmNetwork.id])
      )
  },
})

export const activeTokensWithTestnetsMapState = selector<TokenList>({
  key: "activeTokensWithTestnetsMapState",
  get: ({ get }) => {
    const arTokens = get(activeTokensWithTestnetsState)
    return Object.fromEntries(arTokens.map((token) => [token.id, token]))
  },
})

export const activeTokensWithoutTestnetsMapState = selector<TokenList>({
  key: "activeTokensWithoutTestnetsMapState",
  get: ({ get }) => {
    const arTokens = get(activeTokensWithTestnetsState)
    return Object.fromEntries(arTokens.map((token) => [token.id, token]))
  },
})

export type TokensQueryOptions = {
  activeOnly: boolean
  includeTestnets: boolean
}

export const tokensArrayQuery = selectorFamily({
  key: "tokensArrayQuery",
  get:
    ({ activeOnly, includeTestnets }: TokensQueryOptions) =>
    ({ get }) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeTokensWithTestnetsState)
          : get(activeTokensWithoutTestnetsState)

      return includeTestnets ? get(allTokensState) : get(allTokensWithoutTestnetsState)
    },
})

export const tokensMapQuery = selectorFamily({
  key: "tokensMapQuery",
  get:
    ({ activeOnly, includeTestnets }: TokensQueryOptions) =>
    ({ get }) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeTokensWithTestnetsMapState)
          : get(activeTokensWithoutTestnetsMapState)

      return includeTestnets ? get(allTokensMapState) : get(allTokensWithoutTestnetsMapState)
    },
})

export const tokenQuery = selectorFamily({
  key: "tokenQuery",
  get:
    (tokenId: TokenId | null | undefined) =>
    ({ get }) => {
      const tokens = get(allTokensMapState)
      return tokenId ? tokens[tokenId] : undefined
    },
})
