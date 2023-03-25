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
  default: [],
  effects: [
    // sync from db
    ({ setSelf }) => {
      const obs = liveQuery(() => chaindataProvider.evmNetworksArray())
      const sub = obs.subscribe(setSelf)
      return sub.unsubscribe
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
})

export const evmNetworkQuery = selectorFamily({
  key: "evmNetworkQuery",
  get:
    (evmNetworkId: EvmNetworkId) =>
    ({ get }) => {
      const networks = get(evmNetworksWithTestnetsMapState)
      return networks[evmNetworkId]
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

export const chainsWithTestnetsState = atom<(Chain | CustomChain)[]>({
  key: "chainsWithTestnetsState",
  default: [],
  effects: [
    // sync from db
    ({ setSelf }) => {
      const obs = liveQuery(() => chaindataProvider.chainsArray())
      const sub = obs.subscribe(setSelf)
      return sub.unsubscribe
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
})

export const chainQuery = selectorFamily({
  key: "chainQuery",
  get:
    (chainId: ChainId) =>
    ({ get }) => {
      const networks = get(chainsWithTestnetsMapState)
      return networks[chainId]
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

const getTokensList = async () => {
  const tokens = await chaindataProvider.tokens()

  // Temp hack to indicate that
  //          - EVM GLMR is a mirror of substrate GLMR
  //          - EVM MOVR is a mirror of substrate MOVR
  //          - EVM DEV is a mirror of substrate DEV
  //          - EVM ACA is a mirror of substrate ACA
  const mirrorTokenIds = {
    "1284-evm-native-glmr": "moonbeam-substrate-native-glmr",
    "1285-evm-native-movr": "moonriver-substrate-native-movr",
    "1287-evm-native-dev": "moonbase-alpha-testnet-substrate-native-dev",
    "787-evm-native-aca": "acala-substrate-native-aca",
  }

  Object.entries(mirrorTokenIds)
    .filter(([mirrorToken]) => tokens[mirrorToken])
    .forEach(([mirrorToken, mirrorOf]) => ((tokens[mirrorToken] as any).mirrorOf = mirrorOf))

  return tokens
}

const rawTokenListState = atom<TokenList>({
  key: "rawTokenListState",
  default: {},
  effects: [
    // sync from db
    ({ setSelf }) => {
      const obs = liveQuery(() => getTokensList())
      const sub = obs.subscribe(setSelf)

      return sub.unsubscribe
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
      const tokens = get(tokensWithTestnetsMapState)
      return tokenId ? tokens[tokenId] : undefined
    },
})
