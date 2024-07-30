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
import { atom } from "jotai"
import { atomFamily, atomWithObservable } from "jotai/utils"
import isEqual from "lodash/isEqual"
import { Observable } from "rxjs"

import {
  ActiveChains,
  activeChainsStore,
  ActiveEvmNetworks,
  activeEvmNetworksStore,
  ActiveTokens,
  activeTokensStore,
  isChainActive,
  isEvmNetworkActive,
  isTokenActive,
} from "@extension/core"
import { api } from "@ui/api"
import { chaindataProvider } from "@ui/domains/Chains/chaindataProvider"

import { atomWithSubscription } from "./utils/atomWithSubscription"
import { logObservableUpdate } from "./utils/logObservableUpdate"

const NO_OP = () => {}

const filterNoTestnet = ({ isTestnet }: { isTestnet?: boolean }) => isTestnet === false

export const evmNetworksActiveAtom = atomWithSubscription<ActiveEvmNetworks>(
  (callback) => {
    const sub = activeEvmNetworksStore.observable.subscribe(callback)
    return () => sub.unsubscribe()
  },
  { debugLabel: "evmNetworksActiveAtom" }
)

const allEvmNetworksSubscriptionAtom = atomWithSubscription<void>(
  () => api.ethereumNetworks(NO_OP),
  { debugLabel: "allEvmNetworksSubscriptionAtom" }
)
const allEvmNetworksObservableAtom = atomWithObservable(() =>
  chaindataProvider.evmNetworksObservable.pipe(logObservableUpdate("allEvmNetworksObservableAtom"))
)

export const allEvmNetworksAtom = atom((get) => {
  get(allEvmNetworksSubscriptionAtom)
  return get(allEvmNetworksObservableAtom)
})

export const allEvmNetworksMapAtom = atom(async (get) => {
  const evmNetworks = await get(allEvmNetworksAtom)
  return Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
})

const allEvmNetworksWithoutTestnetsAtom = atom(async (get) => {
  const evmNetworks = await get(allEvmNetworksAtom)
  return evmNetworks.filter(filterNoTestnet)
})

const allEvmNetworksWithoutTestnetsMapAtom = atom(async (get) => {
  const evmNetworks = await get(allEvmNetworksWithoutTestnetsAtom)
  return Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
})

const activeEvmNetworksWithTestnetsAtom = atom(async (get) => {
  const [evmNetworks, activeNetworks] = await Promise.all([
    get(allEvmNetworksAtom),
    get(evmNetworksActiveAtom),
  ])

  // return only active networks
  return evmNetworks.filter((network) => isEvmNetworkActive(network, activeNetworks))
})

export const activeEvmNetworksWithTestnetsMapAtom = atom(async (get) => {
  const evmNetworks = await get(activeEvmNetworksWithTestnetsAtom)
  return Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
})

const activeEvmNetworksWithoutTestnetsAtom = atom(async (get) => {
  const evmNetworks = await get(activeEvmNetworksWithTestnetsAtom)
  return evmNetworks.filter(filterNoTestnet)
})

const activeEvmNetworksWithoutTestnetsMapAtom = atom(async (get) => {
  const evmNetworks = await get(activeEvmNetworksWithoutTestnetsAtom)
  return Object.fromEntries(evmNetworks.map((network) => [network.id, network])) as EvmNetworkList
})

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
    }),
  isEqual
)

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
    }),
  isEqual
)

export const evmNetworkAtomFamily = atomFamily((evmNetworkId: EvmNetworkId | null | undefined) =>
  atom(async (get) => {
    if (!evmNetworkId) return null
    const evmNetworks = await get(allEvmNetworksMapAtom)
    return evmNetworks[evmNetworkId] || null
  })
)

export const chainsActiveAtom = atomWithSubscription<ActiveChains>(
  (callback) => {
    const sub = activeChainsStore.observable.subscribe(callback)
    return () => sub.unsubscribe()
  },
  { debugLabel: "chainsActiveAtom" }
)

const allChainsSubscriptionAtom = atomWithSubscription<void>(() => api.chains(NO_OP), {
  debugLabel: "allChainsSubscriptionAtom",
})
const allChainsObservableAtom = atomWithObservable(() =>
  chaindataProvider.chainsObservable.pipe(logObservableUpdate("allChainsObservableAtom"))
)

export const allChainsAtom = atom((get) => {
  get(allChainsSubscriptionAtom)
  return get(allChainsObservableAtom)
})

export const allChainsMapAtom = atom(async (get) => {
  const chains = await get(allChainsAtom)
  return Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList
})

export const allChainsMapByGenesisHashAtom = atom(async (get) => {
  const chains = await get(allChainsAtom)
  return Object.fromEntries(
    chains.flatMap((chain) => (chain.genesisHash ? [[chain.genesisHash, chain]] : []))
  ) as ChainList
})

const allChainsWithoutTestnetsAtom = atom(async (get) => {
  const chains = await get(allChainsAtom)
  return chains.filter(filterNoTestnet)
})

const allChainsWithoutTestnetsMapAtom = atom(async (get) => {
  const chains = await get(allChainsWithoutTestnetsAtom)
  return Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList
})

const activeChainsWithTestnetsAtom = atom(async (get) => {
  const [chains, activeChains] = await Promise.all([get(allChainsAtom), get(chainsActiveAtom)])

  // return only active networks
  return chains.filter((network) => isChainActive(network, activeChains))
})

export const activeChainsWithTestnetsMapAtom = atom(async (get) => {
  const chains = await get(activeChainsWithTestnetsAtom)
  return Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList
})

const activeChainsWithoutTestnetsAtom = atom(async (get) => {
  const chains = await get(activeChainsWithTestnetsAtom)
  return chains.filter(filterNoTestnet)
})

const activeChainsWithoutTestnetsMapAtom = atom(async (get) => {
  const chains = await get(activeChainsWithoutTestnetsAtom)
  return Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList
})

const chainsByGenesisHashMapAtom = atom(async (get) => {
  const chains = await get(allChainsAtom)
  return Object.fromEntries(chains.map((chain) => [chain.genesisHash, chain])) as Record<
    HexString,
    Chain | CustomChain
  >
})

export const chainByGenesisHashAtomFamily = atomFamily(
  (genesisHash: HexString | null | undefined) =>
    atom(async (get) => {
      if (!genesisHash) return null
      const chains = await get(chainsByGenesisHashMapAtom)
      return chains[genesisHash] || null
    })
)

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
    }),
  isEqual
)

export const chainsMapAtomFamily = atomFamily(
  ({ activeOnly, includeTestnets }: ChainsQueryOptions) =>
    atom(async (get) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeChainsWithTestnetsMapAtom)
          : get(activeChainsWithoutTestnetsMapAtom)

      return includeTestnets ? get(allChainsMapAtom) : get(allChainsWithoutTestnetsMapAtom)
    }),
  isEqual
)

export const chainByIdAtomFamily = atomFamily((chainId: ChainId | null | undefined) =>
  atom(async (get) => {
    if (!chainId) return null
    const chains = await get(allChainsMapAtom)
    return chains[chainId] || null
  })
)

export const tokensActiveAtom = atomWithSubscription<ActiveTokens>(
  (callback) => {
    const sub = activeTokensStore.observable.subscribe(callback)
    return () => sub.unsubscribe()
  },
  { debugLabel: "tokensActiveAtom" }
)

const allTokensMapSubscriptionAtom = atomWithSubscription<void>(() => api.tokens(NO_OP), {
  debugLabel: "allTokensMapSubscriptionAtom",
})
const allTokensMapObservableAtom = atomWithObservable<TokenList>(() =>
  (chaindataProvider.tokensByIdObservable as Observable<TokenList>).pipe(
    logObservableUpdate("allTokensMapObservableAtom")
  )
)

export const allTokensMapAtom = atom((get) => {
  get(allTokensMapSubscriptionAtom)
  return get(allTokensMapObservableAtom)
})

export const allTokensAtom = atom(async (get) => {
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

const allTokensWithoutTestnetsMapAtom = atom(async (get) => {
  const tokens = await get(allTokensWithoutTestnetsAtom)
  return Object.fromEntries(tokens.map((token) => [token.id, token]))
})

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

export const activeTokensWithTestnetsMapAtom = atom(async (get) => {
  const tokens = await get(activeTokensWithTestnetsAtom)
  return Object.fromEntries(tokens.map((token) => [token.id, token])) as TokenList
})

export const activeTokensWithoutTestnetsMapAtom = atom(async (get) => {
  const tokens = await get(activeTokensWithoutTestnetsAtom)
  return Object.fromEntries(tokens.map((token) => [token.id, token])) as TokenList
})

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
    }),
  isEqual
)

export const tokensMapAtomFamily = atomFamily(
  ({ activeOnly, includeTestnets }: TokensQueryOptions) =>
    atom((get) => {
      if (activeOnly)
        return includeTestnets
          ? get(activeTokensWithTestnetsMapAtom)
          : get(activeTokensWithoutTestnetsMapAtom)

      return includeTestnets ? get(allTokensMapAtom) : get(allTokensWithoutTestnetsMapAtom)
    }),
  isEqual
)

export const tokenByIdAtomFamily = atomFamily((tokenId: TokenId | null | undefined) =>
  atom(async (get) => {
    if (!tokenId) return null
    const tokens = await get(allTokensMapAtom)
    return tokens[tokenId] || null
  })
)
