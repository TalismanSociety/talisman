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
import { liveQuery } from "dexie"
import { atom, selector, selectorFamily } from "recoil"

const NO_OP = () => {}
const filterNoTestnet = ({ isTestnet }: { isTestnet?: boolean }) => isTestnet === false

export const evmNetworksWithTestnetsState = atom<(EvmNetwork | CustomEvmNetwork)[]>({
  key: "evmNetworksWithTestnetsState",
  effects: [
    // sync from db
    ({ setSelf }) => {
      const key = "evmNetworksWithTestnetsState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const obs = liveQuery(() => chaindataProvider.evmNetworksArray())
      const sub = obs.subscribe((v) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(v)
      })
      return () => sub.unsubscribe()
    },
    // instruct backend to keep db updated while this atom is in use
    () => api.ethereumNetworks(NO_OP),
  ],
})

export const evmNetworksWithTestnetsMapState = selector<EvmNetworkList>({
  key: "evmNetworksWithTestnetsMapState",
  get: ({ get }) => {
    const evmNetworks = get(evmNetworksWithTestnetsState)
    return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const evmNetworkQuery = selectorFamily({
  key: "evmNetworkQuery",
  get:
    (evmNetworkId: EvmNetworkId) =>
    ({ get }) => {
      const networks = get(evmNetworksWithTestnetsMapState)
      return networks[evmNetworkId]
    },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const evmNetworksWithoutTestnetsState = selector({
  key: "evmNetworksWithoutTestnetsState",
  get: ({ get }) => {
    const evmNetworks = get(evmNetworksWithTestnetsState)
    return evmNetworks.filter(filterNoTestnet)
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const evmNetworksWithoutTestnetsMapState = selector<EvmNetworkList>({
  key: "evmNetworksWithoutTestnetsMapState",
  get: ({ get }) => {
    const evmNetworks = get(evmNetworksWithoutTestnetsState)
    return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const chainsWithTestnetsState = atom<(Chain | CustomChain)[]>({
  key: "chainsWithTestnetsState",
  effects: [
    // sync from db
    ({ setSelf }) => {
      const key = "chainsWithTestnetsState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const obs = liveQuery(() => chaindataProvider.chainsArray())
      const sub = obs.subscribe((v) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(v)
      })
      return () => sub.unsubscribe()
    },
    // instruct backend to keep db syncrhonized while this atom is in use
    () => api.chains(NO_OP),
  ],
})

export const chainsWithTestnetsMapState = selector<ChainList>({
  key: "chainsWithTestnetsMapState",
  get: ({ get }) => {
    const chains = get(chainsWithTestnetsState)
    return Object.fromEntries(chains.map((network) => [network.id, network]))
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const chainQuery = selectorFamily({
  key: "chainQuery",
  get:
    (chainId: ChainId) =>
    ({ get }) => {
      const networks = get(chainsWithTestnetsMapState)
      return networks[chainId]
    },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const chainsWithoutTestnetsState = selector({
  key: "chainsWithoutTestnetsState",
  get: ({ get }) => {
    const chains = get(chainsWithTestnetsState)
    return chains.filter(filterNoTestnet)
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const chainsWithoutTestnetsMapState = selector<ChainList>({
  key: "chainsWithoutTestnetsMapState",
  get: ({ get }) => {
    const chains = get(chainsWithoutTestnetsState)
    return Object.fromEntries(chains.map((network) => [network.id, network]))
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

const rawTokenListState = atom<TokenList>({
  key: "rawTokenListState",
  effects: [
    // sync from db
    ({ setSelf }) => {
      const key = "rawTokenListState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const obs = liveQuery(() => chaindataProvider.tokens())
      const sub = obs.subscribe((v) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(v)
      })

      return () => sub.unsubscribe()
    },
    // instruct backend to keep db syncrhonized while this atom is in use
    () => api.tokens(NO_OP),
  ],
})

export const tokensWithTestnetsState = selector<Token[]>({
  key: "tokensWithTestnetsState",
  get: ({ get }) => {
    const tokensMap = get(rawTokenListState)
    const chainsMap = get(chainsWithTestnetsMapState)
    const evmNetworksMap = get(evmNetworksWithTestnetsMapState)
    return Object.values(tokensMap).filter(
      (token) =>
        (token.chain && chainsMap[token.chain.id]) ||
        (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
    )
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const tokensWithoutTestnetsState = selector<Token[]>({
  key: "tokensWithoutTestnetsState",
  get: ({ get }) => {
    const arTokensWithTestnets = get(tokensWithTestnetsState)
    const chainsWithoutTestnetsMap = get(chainsWithoutTestnetsMapState)
    const evmNetworksWithoutTestnetsMap = get(evmNetworksWithoutTestnetsMapState)
    return arTokensWithTestnets
      .filter(filterNoTestnet)
      .filter(
        (token) =>
          (token.chain && chainsWithoutTestnetsMap[token.chain.id]) ||
          (token.evmNetwork && evmNetworksWithoutTestnetsMap[token.evmNetwork.id])
      )
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const tokensWithTestnetsMapState = selector<TokenList>({
  key: "tokensWithTestnetsMapState",
  get: ({ get }) => {
    const arTokens = get(tokensWithTestnetsState)
    return Object.fromEntries(arTokens.map((token) => [token.id, token]))
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const tokensWithoutTestnetsMapState = selector<TokenList>({
  key: "tokensWithoutTestnetsMapState",
  get: ({ get }) => {
    const arTokens = get(tokensWithTestnetsState)
    return Object.fromEntries(arTokens.map((token) => [token.id, token]))
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const tokenQuery = selectorFamily({
  key: "tokenQuery",
  get:
    (tokenId: TokenId | null | undefined) =>
    ({ get }) => {
      const tokens = get(tokensWithTestnetsMapState)
      return tokenId ? tokens[tokenId] : undefined
    },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})
