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
import { chaindataProvider } from "@core/rpcs/chaindata"
import { HexString } from "@polkadot/util/types"
import {
  Chain,
  ChainId,
  ChainList,
  CustomChain,
  EvmNetworkId,
  EvmNetworkList,
  TokenId,
  TokenList,
} from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { atom } from "jotai"
import { atomFamily, atomWithObservable } from "jotai/utils"

import { atomWithSubscription } from "./utils/atomWithSubscription"

const NO_OP = () => {}

const filterNoTestnet = ({ isTestnet }: { isTestnet?: boolean }) => isTestnet === false

export const evmNetworksActiveAtom = atomWithSubscription<ActiveEvmNetworks>((callback) => {
  const sub = activeEvmNetworksStore.observable.subscribe(callback)
  return () => sub.unsubscribe()
}, "evmNetworksActiveAtom")

// export const evmNetworksActiveState = ratom<ActiveEvmNetworks>({
//   key: "evmNetworksActiveState",
//   effects: [
//     ({ setSelf }) => {
//       log.debug("evmNetworksActiveState.init")
//       const sub = activeEvmNetworksStore.observable.subscribe(setSelf)
//       return () => sub.unsubscribe()
//     },
//   ],
// })

const allEvmNetworksSubscriptionAtom = atomWithSubscription<void>(
  () => api.ethereumNetworks(NO_OP),
  "allEvmNetworksSubscriptionAtom"
)
const allEvmNetworksObservableAtom = atomWithObservable(
  () => chaindataProvider.evmNetworksObservable
)

export const allEvmNetworksAtom = atom((get) => {
  get(allEvmNetworksSubscriptionAtom)
  return get(allEvmNetworksObservableAtom)
})

// export const allEvmNetworksState = ratom<(EvmNetwork | CustomEvmNetwork)[]>({
//   key: "allEvmNetworksState",
//   effects: [
//     ({ setSelf }) => {
//       log.debug("allEvmNetworksState.init")
//       const sub = chaindataProvider.evmNetworksObservable.subscribe(setSelf)
//       return () => sub.unsubscribe()
//     },
//     () => api.ethereumNetworks(NO_OP),
//   ],
// })

const allEvmNetworksMapAtom = atom(async (get) => {
  const evmNetworks = await get(allEvmNetworksAtom)
  return Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
})

// export const allEvmNetworksMapState = selector<EvmNetworkList>({
//   key: "allEvmNetworksMapState",
//   get: ({ get }) => {
//     const evmNetworks = get(allEvmNetworksState)
//     return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
//   },
// })

const allEvmNetworksWithoutTestnetsAtom = atom(async (get) => {
  const evmNetworks = await get(allEvmNetworksAtom)
  return evmNetworks.filter(filterNoTestnet)
})

// export const allEvmNetworksWithoutTestnetsState = selector<(EvmNetwork | CustomEvmNetwork)[]>({
//   key: "allEvmNetworksWithoutTestnetsState",
//   get: ({ get }) => {
//     const evmNetworks = get(allEvmNetworksState)
//     return evmNetworks.filter(filterNoTestnet)
//   },
// })

const allEvmNetworksWithoutTestnetsMapAtom = atom(async (get) => {
  const evmNetworks = await get(allEvmNetworksWithoutTestnetsAtom)
  return Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
})

// export const allEvmNetworksWithoutTestnetsMapState = selector<EvmNetworkList>({
//   key: "allEvmNetworksWithoutTestnetsMapState",
//   get: ({ get }) => {
//     const evmNetworks = get(allEvmNetworksWithoutTestnetsState)
//     return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
//   },
// })

const activeEvmNetworksWithTestnetsAtom = atom(async (get) => {
  const [evmNetworks, activeNetworks] = await Promise.all([
    get(allEvmNetworksAtom),
    get(evmNetworksActiveAtom),
  ])

  // return only active networks
  return evmNetworks.filter((network) => isEvmNetworkActive(network, activeNetworks))
})

// export const activeEvmNetworksWithTestnetsState = selector({
//   key: "activeEvmNetworksWithTestnetsState",
//   get: ({ get }) => {
//     const [evmNetworks, activeNetworks] = get(
//       waitForAll([allEvmNetworksState, evmNetworksActiveState])
//     )

//     // return only active networks
//     return evmNetworks.filter((network) => isEvmNetworkActive(network, activeNetworks))
//   },
// })

export const activeEvmNetworksWithTestnetsMapAtom = atom(async (get) => {
  const evmNetworks = await get(activeEvmNetworksWithTestnetsAtom)
  return Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
})

// export const activeEvmNetworksWithTestnetsMapState = selector<EvmNetworkList>({
//   key: "activeEvmNetworksWithTestnetsMapState",
//   get: ({ get }) => {
//     const evmNetworks = get(activeEvmNetworksWithTestnetsState)
//     return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
//   },
// })

const activeEvmNetworksWithoutTestnetsAtom = atom(async (get) => {
  const evmNetworks = await get(activeEvmNetworksWithTestnetsAtom)
  return evmNetworks.filter(filterNoTestnet)
})

// export const activeEvmNetworksWithoutTestnetsState = selector({
//   key: "activeEvmNetworksWithoutTestnetsState",
//   get: ({ get }) => {
//     const evmNetworks = get(activeEvmNetworksWithTestnetsState)
//     return evmNetworks.filter(filterNoTestnet)
//   },
// })

const activeEvmNetworksWithoutTestnetsMapAtom = atom(async (get) => {
  const evmNetworks = await get(activeEvmNetworksWithoutTestnetsAtom)
  return Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
})

// export const activeEvmNetworksWithoutTestnetsMapState = selector<EvmNetworkList>({
//   key: "activeEvmNetworksWithoutTestnetsMapState",
//   get: ({ get }) => {
//     const evmNetworks = get(activeEvmNetworksWithoutTestnetsState)
//     return Object.fromEntries(evmNetworks.map((network) => [network.id, network]))
//   },
// })

export type EvmNetworksQueryOptions = {
  activeOnly: boolean
  includeTestnets: boolean
}

export const evmNetworksArrayAtomFamily = atomFamily(
  ({ activeOnly, includeTestnets }: EvmNetworksQueryOptions) =>
    atom((get) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeEvmNetworksWithTestnetsAtom)
          : get(activeEvmNetworksWithoutTestnetsAtom)

      return includeTestnets ? get(allEvmNetworksAtom) : get(allEvmNetworksWithoutTestnetsAtom)
    })
)

// export const evmNetworksArrayQuery = selectorFamily({
//   key: "evmNetworksArrayQuery",
//   get:
//     ({ activeOnly, includeTestnets }: EvmNetworksQueryOptions) =>
//     ({ get }) => {
//       if (activeOnly)
//         return includeTestnets
//           ? get(activeEvmNetworksWithTestnetsState)
//           : get(activeEvmNetworksWithoutTestnetsState)

//       return includeTestnets ? get(allEvmNetworksState) : get(allEvmNetworksWithoutTestnetsState)
//     },
// })

export const evmNetworksMapAtomFamily = atomFamily(
  ({ activeOnly, includeTestnets }: EvmNetworksQueryOptions) =>
    atom((get) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeEvmNetworksWithTestnetsMapAtom)
          : get(activeEvmNetworksWithoutTestnetsMapAtom)

      return includeTestnets
        ? get(allEvmNetworksMapAtom)
        : get(allEvmNetworksWithoutTestnetsMapAtom)
    })
)

// export const evmNetworksMapQuery = selectorFamily({
//   key: "evmNetworksMapQuery",
//   get:
//     ({ activeOnly, includeTestnets }: EvmNetworksQueryOptions) =>
//     ({ get }) => {
//       if (activeOnly)
//         return includeTestnets
//           ? get(activeEvmNetworksWithTestnetsMapState)
//           : get(activeEvmNetworksWithoutTestnetsMapState)

//       return includeTestnets
//         ? get(allEvmNetworksMapState)
//         : get(allEvmNetworksWithoutTestnetsMapState)
//     },
// })

export const evmNetworkAtomFamily = atomFamily((evmNetworkId: EvmNetworkId | null | undefined) =>
  atom(async (get) => {
    const evmNetworks = await get(allEvmNetworksMapAtom)
    return (evmNetworkId && evmNetworks[evmNetworkId]) || null
  })
)

// export const evmNetworkQuery = selectorFamily({
//   key: "evmNetworkQuery",
//   get:
//     (evmNetworkId: EvmNetworkId | null | undefined) =>
//     ({ get }) => {
//       const evmNetworks = get(allEvmNetworksMapState)
//       return evmNetworkId ? evmNetworks[evmNetworkId] : undefined
//     },
// })

export const chainsActiveAtom = atomWithSubscription<ActiveChains>((callback) => {
  const sub = activeChainsStore.observable.subscribe(callback)
  return () => sub.unsubscribe()
}, "chainsActiveAtom")

// export const chainsActiveState = ratom<ActiveChains>({
//   key: "chainsActiveState",
//   effects: [
//     ({ setSelf }) => {
//       log.debug("chainsActiveState.init")
//       const sub = activeChainsStore.observable.subscribe(setSelf)
//       return () => sub.unsubscribe()
//     },
//   ],
// })

const allChainsSubscriptionAtom = atomWithSubscription<void>(
  () => api.chains(NO_OP),
  "allChainsSubscriptionAtom"
)
const allChainsObservableAtom = atomWithObservable(() => chaindataProvider.chainsObservable)

export const allChainsAtom = atom((get) => {
  get(allChainsSubscriptionAtom)
  return get(allChainsObservableAtom)
})

// export const allChainsState = ratom<(Chain | CustomChain)[]>({
//   key: "allChainsState",
//   effects: [
//     ({ setSelf }) => {
//       log.debug("allChainsState.init")
//       const sub = chaindataProvider.chainsObservable.subscribe(setSelf)
//       return () => sub.unsubscribe()
//     },
//     () => api.chains(NO_OP),
//   ],
// })

const allChainsMapAtom = atom(async (get) => {
  const chains = await get(allChainsAtom)
  return Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList
})

// export const allChainsMapState = selector<ChainList>({
//   key: "allChainsMapState",
//   get: ({ get }) => {
//     const chains = get(allChainsState)
//     return Object.fromEntries(chains.map((network) => [network.id, network]))
//   },
// })

const allChainsWithoutTestnetsAtom = atom(async (get) => {
  const chains = await get(allChainsAtom)
  return chains.filter(filterNoTestnet)
})

// export const allChainsWithoutTestnetsState = selector({
//   key: "allChainsWithoutTestnetsState",
//   get: ({ get }) => {
//     const chains = get(allChainsState)
//     return chains.filter(filterNoTestnet)
//   },
// })

const allChainsWithoutTestnetsMapAtom = atom(async (get) => {
  const chains = await get(allChainsWithoutTestnetsAtom)
  return Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList
})

// export const allChainsWithoutTestnetsMapState = selector<ChainList>({
//   key: "allChainsWithoutTestnetsMapState",
//   get: ({ get }) => {
//     const chains = get(allChainsWithoutTestnetsState)
//     return Object.fromEntries(chains.map((network) => [network.id, network]))
//   },
// })

const activeChainsWithTestnetsAtom = atom(async (get) => {
  const [chains, activeChains] = await Promise.all([get(allChainsAtom), get(chainsActiveAtom)])

  // return only active networks
  return chains.filter((network) => isChainActive(network, activeChains))
})

// export const activeChainsWithTestnetsState = selector({
//   key: "activeChainsWithTestnetsState",
//   get: ({ get }) => {
//     const [chains, activeChains] = get(waitForAll([allChainsState, chainsActiveState]))
//     return chains.filter((network) => isChainActive(network, activeChains))
//   },
// })

export const activeChainsWithTestnetsMapAtom = atom(async (get) => {
  const chains = await get(activeChainsWithTestnetsAtom)
  return Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList
})

// export const activeChainsWithTestnetsMapState = selector<ChainList>({
//   key: "activeChainsWithTestnetsMapState",
//   get: ({ get }) => {
//     const chains = get(activeChainsWithTestnetsState)
//     return Object.fromEntries(chains.map((network) => [network.id, network]))
//   },
// })

const activeChainsWithoutTestnetsAtom = atom(async (get) => {
  const chains = await get(activeChainsWithTestnetsAtom)
  return chains.filter(filterNoTestnet)
})

// export const activeChainsWithoutTestnetsState = selector({
//   key: "activeChainsWithoutTestnetsState",
//   get: ({ get }) => {
//     const chains = get(activeChainsWithTestnetsState)
//     return chains.filter(filterNoTestnet)
//   },
// })

const activeChainsWithoutTestnetsMapAtom = atom(async (get) => {
  const chains = await get(activeChainsWithoutTestnetsAtom)
  return Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList
})

// export const activeChainsWithoutTestnetsMapState = selector<ChainList>({
//   key: "activeChainsWithoutTestnetsMapState",
//   get: ({ get }) => {
//     const chains = get(activeChainsWithoutTestnetsState)
//     return Object.fromEntries(chains.map((network) => [network.id, network]))
//   },
// })

const chainsByGenesisHashMapAtom = atom(async (get) => {
  const chains = await get(allChainsAtom)
  return Object.fromEntries(chains.map((chain) => [chain.genesisHash, chain])) as Record<
    HexString,
    Chain | CustomChain
  >
})

// const chainsByGenesisHashMapState = selector({
//   key: "chainsByGenesisHashMapState",
//   get: ({ get }) => {
//     const chains = get(allChainsState)
//     return Object.fromEntries(chains.map((chain) => [chain.genesisHash, chain])) as Record<
//       string,
//       Chain | CustomChain
//     >
//   },
// })

export const chainByGenesisHashAtomFamily = atomFamily(
  (genesisHash: HexString | null | undefined) =>
    atom(async (get) => {
      const chains = await get(chainsByGenesisHashMapAtom)
      return (genesisHash && chains[genesisHash]) || null
    })
)

// export const chainByGenesisHashQuery = selectorFamily({
//   key: "chainByGenesisHashQuery",
//   get:
//     (genesisHash: string | null | undefined) =>
//     ({ get }) => {
//       const chains = get(chainsByGenesisHashMapState)
//       return genesisHash ? chains[genesisHash] : undefined
//     },
// })

export type ChainsQueryOptions = {
  activeOnly: boolean
  includeTestnets: boolean
}

export const chainsArrayAtomFamily = atomFamily(
  ({ activeOnly, includeTestnets }: ChainsQueryOptions) =>
    atom(async (get) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeChainsWithTestnetsAtom)
          : get(activeChainsWithoutTestnetsAtom)

      return includeTestnets ? get(allChainsAtom) : get(allChainsWithoutTestnetsAtom)
    })
)

// export const chainsArrayQuery = selectorFamily({
//   key: "chainsArrayQuery",
//   get:
//     ({ activeOnly, includeTestnets }: ChainsQueryOptions) =>
//     ({ get }) => {
//       if (activeOnly)
//         return includeTestnets
//           ? get(activeChainsWithTestnetsState)
//           : get(activeChainsWithoutTestnetsState)

//       return includeTestnets ? get(allChainsState) : get(allChainsWithoutTestnetsState)
//     },
// })

export const chainsMapAtomFamily = atomFamily(
  ({ activeOnly, includeTestnets }: ChainsQueryOptions) =>
    atom(async (get) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeChainsWithTestnetsMapAtom)
          : get(activeChainsWithoutTestnetsMapAtom)

      return includeTestnets ? get(allChainsMapAtom) : get(allChainsWithoutTestnetsMapAtom)
    })
)

// export const chainsMapQuery = selectorFamily({
//   key: "chainsMapQuery",
//   get:
//     ({ activeOnly, includeTestnets }: ChainsQueryOptions) =>
//     ({ get }) => {
//       if (activeOnly)
//         return includeTestnets
//           ? get(activeChainsWithTestnetsMapState)
//           : get(activeChainsWithoutTestnetsMapState)

//       return includeTestnets ? get(allChainsMapState) : get(allChainsWithoutTestnetsMapState)
//     },
// })

export const chainByIdAtomFamily = atomFamily((chainId: ChainId | null | undefined) =>
  atom(async (get) => {
    const chains = await get(allChainsMapAtom)
    return (chainId && chains[chainId]) || null
  })
)

// export const chainQuery = selectorFamily({
//   key: "chainQuery",
//   get:
//     (chainId: ChainId | null | undefined) =>
//     ({ get }) => {
//       const chains = get(allChainsMapState)
//       return chainId ? chains[chainId] : undefined
//     },
// })

export const tokensActiveAtom = atomWithSubscription<ActiveTokens>((callback) => {
  const sub = activeTokensStore.observable.subscribe(callback)
  return () => sub.unsubscribe()
}, "tokensActiveAtom")

// export const tokensActiveState = ratom<ActiveTokens>({
//   key: "tokensActiveState",
//   effects: [
//     ({ setSelf }) => {
//       log.debug("tokensActiveState.init")
//       const sub = activeTokensStore.observable.subscribe(setSelf)
//       return () => sub.unsubscribe()
//     },
//   ],
// })

const allTokensMapSubscriptionAtom = atomWithSubscription<void>(
  () => api.tokens(NO_OP),
  "allTokensMapSubscriptionAtom"
)
const allTokensMapObservableAtom = atomWithObservable<TokenList>(
  () => chaindataProvider.tokensByIdObservable
)

export const allTokensMapAtom = atom((get) => {
  get(allTokensMapSubscriptionAtom)
  return get(allTokensMapObservableAtom)
})

// export const allTokensMapState = ratom<TokenList>({
//   key: "allTokensMapState",
//   effects: [
//     ({ setSelf }) => {
//       log.debug("allTokensMapState.init")
//       const sub = chaindataProvider.tokensByIdObservable.subscribe(setSelf)
//       return () => sub.unsubscribe()
//     },
//     () => api.tokens(NO_OP),
//   ],
// })

const allTokensAtom = atom(async (get) => {
  const [tokensMap, chainsMap, evmNetworksMap] = await Promise.all([
    get(allTokensMapAtom),
    get(allChainsMapAtom),
    get(allEvmNetworksMapAtom),
  ])
  return Object.values(tokensMap).filter(
    (token) =>
      (token.chain && chainsMap[token.chain.id]) ||
      (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
  )
})

// export const allTokensState = selector<Token[]>({
//   key: "allTokensState",
//   get: ({ get }) => {
//     const [tokensMap, chainsMap, evmNetworksMap] = get(
//       waitForAll([allTokensMapState, allChainsMapState, allEvmNetworksMapState])
//     )
//     return Object.values(tokensMap).filter(
//       (token) =>
//         (token.chain && chainsMap[token.chain.id]) ||
//         (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
//     )
//   },
// })

const allTokensWithoutTestnetsAtom = atom(async (get) => {
  const [tokensMap, chainsMap, evmNetworksMap] = await Promise.all([
    get(allTokensMapAtom),
    get(allChainsWithoutTestnetsMapAtom),
    get(allEvmNetworksWithoutTestnetsMapAtom),
  ])
  return Object.values(tokensMap)
    .filter(filterNoTestnet)
    .filter(
      (token) =>
        (token.chain && chainsMap[token.chain.id]) ||
        (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
    )
})

// export const allTokensWithoutTestnetsState = selector<Token[]>({
//   key: "allTokensWithoutTestnetsState",
//   get: ({ get }) => {
//     const [tokensMap, chainsMap, evmNetworksMap] = get(
//       waitForAll([
//         allTokensMapState,
//         allChainsWithoutTestnetsMapState,
//         allEvmNetworksWithoutTestnetsMapState,
//       ])
//     )
//     return Object.values(tokensMap)
//       .filter(filterNoTestnet)
//       .filter(
//         (token) =>
//           (token.chain && chainsMap[token.chain.id]) ||
//           (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
//       )
//   },
// })

const allTokensWithoutTestnetsMapAtom = atom(async (get) => {
  const tokens = await get(allTokensWithoutTestnetsAtom)
  return Object.fromEntries(tokens.map((token) => [token.id, token]))
})

// export const allTokensWithoutTestnetsMapState = selector<TokenList>({
//   key: "allTokensWithoutTestnetsMapState",
//   get: ({ get }) => {
//     const tokens = get(allTokensWithoutTestnetsState)
//     return Object.fromEntries(tokens.map((token) => [token.id, token]))
//   },
// })

const activeTokensWithTestnetsAtom = atom(async (get) => {
  const [tokens, chainsMap, evmNetworksMap, activeTokens] = await Promise.all([
    get(allTokensAtom),
    get(activeChainsWithTestnetsMapAtom),
    get(activeEvmNetworksWithTestnetsMapAtom),
    get(tokensActiveAtom),
  ])
  return tokens.filter(
    (token) =>
      ((token.chain && chainsMap[token.chain.id]) ||
        (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])) &&
      isTokenActive(token, activeTokens)
  )
})

// export const activeTokensWithTestnetsState = selector<Token[]>({
//   key: "activeTokensWithTestnetsState",
//   get: ({ get }) => {
//     const [tokens, chainsMap, evmNetworksMap, activeTokens] = get(
//       waitForAll([
//         allTokensState,
//         activeChainsWithTestnetsMapState,
//         activeEvmNetworksWithTestnetsMapState,
//         tokensActiveState,
//       ])
//     )
//     return tokens.filter(
//       (token) =>
//         ((token.chain && chainsMap[token.chain.id]) ||
//           (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])) &&
//         isTokenActive(token, activeTokens)
//     )
//   },
// })

const activeTokensWithoutTestnetsAtom = atom(async (get) => {
  const [arTokensWithTestnets, chainsWithoutTestnetsMap, evmNetworksWithoutTestnetsMap] =
    await Promise.all([
      get(activeTokensWithTestnetsAtom),
      get(activeChainsWithoutTestnetsMapAtom),
      get(activeEvmNetworksWithoutTestnetsMapAtom),
    ])
  return arTokensWithTestnets
    .filter(filterNoTestnet)
    .filter(
      (token) =>
        (token.chain && chainsWithoutTestnetsMap[token.chain.id]) ||
        (token.evmNetwork && evmNetworksWithoutTestnetsMap[token.evmNetwork.id])
    )
})

// export const activeTokensWithoutTestnetsState = selector<Token[]>({
//   key: "activeTokensWithoutTestnetsState",
//   get: ({ get }) => {
//     const [arTokensWithTestnets, chainsWithoutTestnetsMap, evmNetworksWithoutTestnetsMap] = get(
//       waitForAll([
//         activeTokensWithTestnetsState,
//         activeChainsWithoutTestnetsMapState,
//         activeEvmNetworksWithoutTestnetsMapState,
//       ])
//     )
//     return arTokensWithTestnets
//       .filter(filterNoTestnet)
//       .filter(
//         (token) =>
//           (token.chain && chainsWithoutTestnetsMap[token.chain.id]) ||
//           (token.evmNetwork && evmNetworksWithoutTestnetsMap[token.evmNetwork.id])
//       )
//   },
// })

// export const activeTokensWithTestnetsMapAtom = selectAtom(
//   activeTokensWithTestnetsAtom,
//   (tokens) => Object.fromEntries(tokens.map((token) => [token.id, token])) as TokenList
// )

export const activeTokensWithTestnetsMapAtom = atom(
  async (get) => {
    const tokens = await get(activeTokensWithTestnetsAtom)
    return Object.fromEntries(tokens.map((token) => [token.id, token])) as TokenList
  }
  // activeTokensWithTestnetsAtom,
  // (tokens) => Object.fromEntries(tokens.map((token) => [token.id, token])) as TokenList
)

// export const activeTokensWithTestnetsMapState = selector<TokenList>({
//   key: "activeTokensWithTestnetsMapState",
//   get: ({ get }) => {
//     const arTokens = get(activeTokensWithTestnetsState)
//     return Object.fromEntries(arTokens.map((token) => [token.id, token]))
//   },
// })

export const activeTokensWithoutTestnetsMapAtom = atom(async (get) => {
  const tokens = await get(activeTokensWithoutTestnetsAtom)
  return Object.fromEntries(tokens.map((token) => [token.id, token])) as TokenList
})

// export const activeTokensWithoutTestnetsMapState = selector<TokenList>({
//   key: "activeTokensWithoutTestnetsMapState",
//   get: ({ get }) => {
//     const arTokens = get(activeTokensWithTestnetsState)
//     return Object.fromEntries(arTokens.map((token) => [token.id, token]))
//   },
// })

export type TokensQueryOptions = {
  activeOnly: boolean
  includeTestnets: boolean
}

export const tokensArrayAtomFamily = atomFamily(
  ({ activeOnly, includeTestnets }: TokensQueryOptions) =>
    atom((get) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeTokensWithTestnetsAtom)
          : get(activeTokensWithoutTestnetsAtom)

      return includeTestnets ? get(allTokensAtom) : get(allTokensWithoutTestnetsAtom)
    })
)

// export const tokensArrayQuery = selectorFamily({
//   key: "tokensArrayQuery",
//   get:
//     ({ activeOnly, includeTestnets }: TokensQueryOptions) =>
//     ({ get }) => {
//       if (activeOnly)
//         return includeTestnets
//           ? get(activeTokensWithTestnetsState)
//           : get(activeTokensWithoutTestnetsState)

//       return includeTestnets ? get(allTokensState) : get(allTokensWithoutTestnetsState)
//     },
// })

export const tokensMapAtomFamily = atomFamily(
  ({ activeOnly, includeTestnets }: TokensQueryOptions) =>
    atom((get) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeTokensWithTestnetsMapAtom)
          : get(activeTokensWithoutTestnetsMapAtom)

      return includeTestnets ? get(allTokensMapAtom) : get(allTokensWithoutTestnetsMapAtom)
    })
)

// export const tokensMapQuery = selectorFamily({
//   key: "tokensMapQuery",
//   get:
//     ({ activeOnly, includeTestnets }: TokensQueryOptions) =>
//     ({ get }) => {
//       if (activeOnly)
//         return includeTestnets
//           ? get(activeTokensWithTestnetsMapState)
//           : get(activeTokensWithoutTestnetsMapState)

//       return includeTestnets ? get(allTokensMapState) : get(allTokensWithoutTestnetsMapState)
//     },
// })

export const tokenByIdAtomFamily = atomFamily((tokenId: TokenId | null | undefined) =>
  atom(async (get) => {
    const tokens = await get(allTokensMapAtom)
    return (tokenId && tokens[tokenId]) || null
  })
)
