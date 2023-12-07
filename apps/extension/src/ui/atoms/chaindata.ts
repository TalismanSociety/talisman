import {
  EnabledChains,
  enabledChainsStore,
  isChainEnabled,
} from "@core/domains/chains/store.enabledChains"
import {
  EnabledEvmNetworks,
  enabledEvmNetworksStore,
  isEvmNetworkEnabled,
} from "@core/domains/ethereum/store.enabledEvmNetworks"
import { EnabledTokens, enabledTokensStore } from "@core/domains/tokens/store.enabledTokens"
import { log } from "@core/log"
import { chaindataProvider } from "@core/rpcs/chaindata"
import {
  Chain,
  ChainList,
  CustomChain,
  CustomEvmNetwork,
  EvmNetwork,
  EvmNetworkList,
  Token,
  TokenId,
  TokenList,
} from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { liveQuery } from "dexie"
import { atom, selector, selectorFamily } from "recoil"
import { combineLatest } from "rxjs"

const NO_OP = () => {}

const filterNoTestnet = ({ isTestnet }: { isTestnet?: boolean }) => isTestnet === false

// load these entities in parallel in this atom to prevent recoil/suspense to load them sequentially
const chainDataMainState = atom<{
  evmNetworks: (EvmNetwork | CustomEvmNetwork)[]
  chains: (Chain | CustomChain)[]
  tokens: TokenList
  enabledEvmNetworksState: EnabledEvmNetworks
  enabledChainsState: EnabledChains
  enabledTokensState: EnabledTokens
}>({
  key: "chainDataMainState",
  effects: [
    ({ setSelf }) => {
      const stop = log.timer("chainDataMainState")
      let done = false
      const obsTokens = liveQuery(() => chaindataProvider.tokens())
      const obsEvmNetworks = liveQuery(() => chaindataProvider.evmNetworksArray())
      const obsChains = liveQuery(() => chaindataProvider.chainsArray())

      const obsChainData = combineLatest([
        obsTokens,
        obsEvmNetworks,
        obsChains,
        enabledTokensStore.observable,
        enabledEvmNetworksStore.observable,
        enabledChainsStore.observable,
      ]).subscribe(
        ([
          tokens,
          evmNetworks,
          chains,
          enabledTokensState,
          enabledEvmNetworksState,
          enabledChainsState,
        ]) => {
          if (!done) {
            done = true
            stop()
          }
          setSelf({
            tokens,
            evmNetworks,
            chains,
            enabledTokensState,
            enabledEvmNetworksState,
            enabledChainsState,
          })
        }
      )

      return () => {
        obsChainData.unsubscribe()
      }
    },
    // instruct backend to keep db synchronized while this atom is in use
    () => api.tokens(NO_OP),
    () => api.chains(NO_OP),
    () => api.ethereumNetworks(NO_OP),
  ],
})

export const evmNetworksEnabledState = selector<EnabledEvmNetworks>({
  key: "evmNetworksEnabledState",
  get: ({ get }) => {
    const { enabledEvmNetworksState } = get(chainDataMainState)
    return enabledEvmNetworksState
  },
})

export const allEvmNetworksState = selector<(EvmNetwork | CustomEvmNetwork)[]>({
  key: "allEvmNetworksState",
  get: ({ get }) => {
    const { evmNetworks } = get(chainDataMainState)
    return evmNetworks
  },
})

export const allEvmNetworksMapState = selector<EvmNetworkList>({
  key: "allEvmNetworksMapState",
  get: ({ get }) => {
    const evmNetworks = get(allEvmNetworksState)
    return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
  },
})

export const evmNetworksWithTestnetsState = selector({
  key: "evmNetworksWithTestnetsState",
  get: ({ get }) => {
    const evmNetworks = get(allEvmNetworksState)
    const enabledNetworks = get(evmNetworksEnabledState)

    // return only enabled networks
    return evmNetworks.filter((network) => isEvmNetworkEnabled(network, enabledNetworks))
  },
})

export const evmNetworksWithTestnetsMapState = selector<EvmNetworkList>({
  key: "evmNetworksWithTestnetsMapState",
  get: ({ get }) => {
    const evmNetworks = get(evmNetworksWithTestnetsState)
    return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
  },
})

export const evmNetworksWithoutTestnetsState = selector({
  key: "evmNetworksWithoutTestnetsState",
  get: ({ get }) => {
    const evmNetworks = get(evmNetworksWithTestnetsState)
    return evmNetworks.filter(filterNoTestnet)
  },
})

export const evmNetworksWithoutTestnetsMapState = selector<EvmNetworkList>({
  key: "evmNetworksWithoutTestnetsMapState",
  get: ({ get }) => {
    const evmNetworks = get(evmNetworksWithoutTestnetsState)
    return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
  },
})

export const chainsEnabledState = selector<EnabledChains>({
  key: "chainsEnabledState",
  get: ({ get }) => {
    const { enabledChainsState } = get(chainDataMainState)
    return enabledChainsState
  },
})

export const allChainsState = selector<(Chain | CustomChain)[]>({
  key: "allChainsState",
  get: ({ get }) => {
    const { chains } = get(chainDataMainState)
    return chains
  },
})

export const allChainsMapState = selector<ChainList>({
  key: "allChainsMapState",
  get: ({ get }) => {
    const chains = get(allChainsState)
    return Object.fromEntries(chains.map((network) => [network.id, network]))
  },
})

export const chainsWithTestnetsState = selector({
  key: "chainsWithTestnetsState",
  get: ({ get }) => {
    const chains = get(allChainsState)
    const enabledNetworks = get(chainsEnabledState)
    const result = chains.filter((network) => isChainEnabled(network, enabledNetworks))
    return result
  },
})

export const chainsWithTestnetsMapState = selector<ChainList>({
  key: "chainsWithTestnetsMapState",
  get: ({ get }) => {
    const chains = get(chainsWithTestnetsState)
    return Object.fromEntries(chains.map((network) => [network.id, network]))
  },
})

export const chainsWithoutTestnetsState = selector({
  key: "chainsWithoutTestnetsState",
  get: ({ get }) => {
    const chains = get(chainsWithTestnetsState)
    return chains.filter(filterNoTestnet)
  },
})

export const chainsWithoutTestnetsMapState = selector<ChainList>({
  key: "chainsWithoutTestnetsMapState",
  get: ({ get }) => {
    const chains = get(chainsWithoutTestnetsState)
    return Object.fromEntries(chains.map((network) => [network.id, network]))
  },
})

export const tokensEnabledState = selector<EnabledTokens>({
  key: "tokensEnabledState",
  get: ({ get }) => {
    const { enabledTokensState } = get(chainDataMainState)
    return enabledTokensState
  },
})

export const allTokensMapState = selector<TokenList>({
  key: "allTokensMapState",
  get: ({ get }) => {
    const { tokens } = get(chainDataMainState)
    return tokens
  },
})

export const allTokensState = selector<Token[]>({
  key: "allTokensState",
  get: ({ get }) => {
    const tokensMap = get(allTokensMapState)
    const chainsMap = get(allChainsMapState)
    const evmNetworksMap = get(allEvmNetworksMapState)
    return Object.values(tokensMap).filter(
      (token) =>
        (token.chain && chainsMap[token.chain.id]) ||
        (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
    )
  },
})

export const tokensWithTestnetsState = selector<Token[]>({
  key: "tokensWithTestnetsState",
  get: ({ get }) => {
    const tokens = get(allTokensState)
    const chainsMap = get(chainsWithTestnetsMapState)
    const evmNetworksMap = get(evmNetworksWithTestnetsMapState)
    return tokens.filter(
      (token) =>
        (token.chain && chainsMap[token.chain.id]) ||
        (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
    )
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
})

export const tokensWithTestnetsMapState = selector<TokenList>({
  key: "tokensWithTestnetsMapState",
  get: ({ get }) => {
    const arTokens = get(tokensWithTestnetsState)
    return Object.fromEntries(arTokens.map((token) => [token.id, token]))
  },
})

export const tokensWithoutTestnetsMapState = selector<TokenList>({
  key: "tokensWithoutTestnetsMapState",
  get: ({ get }) => {
    const arTokens = get(tokensWithTestnetsState)
    return Object.fromEntries(arTokens.map((token) => [token.id, token]))
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
