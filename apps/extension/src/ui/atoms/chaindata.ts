import { EnabledChains, isChainEnabled } from "@core/domains/chains/store.enabledChains"
import {
  EnabledEvmNetworks,
  isEvmNetworkEnabled,
} from "@core/domains/ethereum/store.enabledEvmNetworks"
import { EnabledTokens } from "@core/domains/tokens/store.enabledTokens"
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
import { selector, selectorFamily } from "recoil"

import { mainState } from "./main"

const filterNoTestnet = ({ isTestnet }: { isTestnet?: boolean }) => isTestnet === false

export const evmNetworksEnabledState = selector<EnabledEvmNetworks>({
  key: "evmNetworksEnabledState",
  get: ({ get }) => {
    const { enabledEvmNetworksState } = get(mainState)
    return enabledEvmNetworksState
  },
})

export const allEvmNetworksState = selector<(EvmNetwork | CustomEvmNetwork)[]>({
  key: "allEvmNetworksState",
  get: ({ get }) => {
    const { evmNetworks } = get(mainState)
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
    const { enabledChainsState } = get(mainState)
    return enabledChainsState
  },
})

export const allChainsState = selector<(Chain | CustomChain)[]>({
  key: "allChainsState",
  get: ({ get }) => {
    const { chains } = get(mainState)
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
    const { enabledTokensState } = get(mainState)
    return enabledTokensState
  },
})

export const allTokensMapState = selector<TokenList>({
  key: "allTokensMapState",
  get: ({ get }) => {
    const { tokens } = get(mainState)
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
