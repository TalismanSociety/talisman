// import { atomFamily, atomWithObservable } from "jotai/utils"
// import isEqual from "lodash/isEqual"

// import {
//   ChaindataQueryOptions,
//   getChainsMap$,
//   getEvmNetworks$,
//   getEvmNetworksMap$,
//   getTokensMap$,
// } from "@ui/state"

// // const NO_OP = () => {}

// // const filterNoTestnet = ({ isTestnet }: { isTestnet?: boolean }) => isTestnet === false

// // export const evmNetworksActiveAtom = atomWithObservable(() => activeEvmNetworksState$)

// // const allEvmNetworksAtom = atomWithObservable(() => allEvmNetworks$)

// // const allEvmNetworksMapAtom = atomWithObservable(() => allEvmNetworksMap$)

// //const allEvmNetworksWithoutTestnetsAtom = atomWithObservable(() => allEvmNetworksWithoutTestnets$)

// // const allEvmNetworksWithoutTestnetsMapAtom = atomWithObservable(
// //   () => allEvmNetworksWithoutTestnetsMap$
// // )

// //const activeEvmNetworksWithTestnetsAtom = atomWithObservable(() => activeEvmNetworksWithTestnets$)

// // export const activeEvmNetworksWithTestnetsMapAtom = atomWithObservable(
// //   () => activeEvmNetworksWithTestnetsMap$
// // )

// // const activeEvmNetworksWithoutTestnetsAtom = atomWithObservable(
// //   () => activeEvmNetworksWithoutTestnets$
// // )

// // const activeEvmNetworksWithoutTestnetsMapAtom = atomWithObservable(
// //   () => activeEvmNetworksWithoutTestnetsMap$
// // )

// // type EvmNetworksQueryOptions = {
// //   activeOnly: boolean
// //   includeTestnets: boolean
// // }

// export const evmNetworksArrayAtomFamily = atomFamily(
//   ({ activeOnly, includeTestnets }: ChaindataQueryOptions) =>
//     atomWithObservable(() => getEvmNetworks$({ activeOnly, includeTestnets })),
//   isEqual
// )

// // export const evmNetworksMapAtomFamily = atomFamily(
// //   ({ activeOnly, includeTestnets }: ChaindataQueryOptions) =>
// //     atomWithObservable(() => getEvmNetworksMap$({ activeOnly, includeTestnets })),
// //   isEqual
// // )

// // export const chainsActiveAtom = atomWithObservable(() => activeChainsState$)

// // const allChainsSubscriptionAtom = atomWithSubscription<void>(() => api.chains(NO_OP), {
// //   debugLabel: "allChainsSubscriptionAtom",
// // })
// // const allChainsObservableAtom = atomWithObservable(() =>
// //   chaindataProvider.chainsObservable.pipe(logObservableUpdate("allChainsObservableAtom"))
// // )

// // const allChainsAtom = atomWithObservable(() => allChains$)

// // const allChainsMapAtom = atomWithObservable(() => allChainsMap$)

// // export const allChainsMapByGenesisHashAtom = atomWithObservable(() => allChainsByGenesisHash$)

// // const allChainsWithoutTestnetsAtom = atom(async (get) => {
// //   const chains = await get(allChainsAtom)
// //   return chains.filter(filterNoTestnet)
// // })

// // const allChainsWithoutTestnetsMapAtom = atom(async (get) => {
// //   const chains = await get(allChainsWithoutTestnetsAtom)
// //   return Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList
// // })

// // const activeChainsWithTestnetsAtom = atom(async (get) => {
// //   const [chains, activeChains] = await Promise.all([get(allChainsAtom), get(chainsActiveAtom)])

// //   // return only active networks
// //   return chains.filter((network) => isChainActive(network, activeChains))
// // })

// // export const activeChainsWithTestnetsMapAtom = atomWithObservable(
// //   () => activeChainsWithTestnetsMap$
// // )

// // const activeChainsWithoutTestnetsAtom = atom(async (get) => {
// //   const chains = await get(activeChainsWithTestnetsAtom)
// //   return chains.filter(filterNoTestnet)
// // })

// // const activeChainsWithoutTestnetsMapAtom = atom(async (get) => {
// //   const chains = await get(activeChainsWithoutTestnetsAtom)
// //   return Object.fromEntries(chains.map((network) => [network.id, network])) as ChainList
// // })

// /** @deprecated this suspenses for every new key, try to use another approach */
// // export const chainByGenesisHashAtomFamily = atomFamily(
// //   (genesisHash: HexString | null | undefined) =>
// //     atomWithObservable(() => getChainByGenesisHash$(genesisHash))
// // )

// // export type ChainsQueryOptions = {
// //   activeOnly: boolean
// //   includeTestnets: boolean
// // }

// // export const chainsArrayAtomFamily = atomFamily(
// //   ({ activeOnly, includeTestnets }: ChaindataQueryOptions) =>
// //     atomWithObservable(() => getChains$({ activeOnly, includeTestnets })),
// //   isEqual
// // )

// // export const chainsMapAtomFamily = atomFamily(
// //   ({ activeOnly, includeTestnets }: ChaindataQueryOptions) =>
// //     atomWithObservable(() => getChainsMap$({ activeOnly, includeTestnets })),
// //   isEqual
// // )

// // export const chainByIdAtomFamily = atomFamily((chainId: ChainId | null | undefined) =>
// //   atomWithObservable(() => getChain$(chainId))
// // )

// // export const tokensActiveAtom = atomWithObservable(() => activeTokenState$)

// // const allTokensMapSubscriptionAtom = atomWithSubscription<void>(() => api.tokens(NO_OP), {
// //   debugLabel: "allTokensMapSubscriptionAtom",
// // })
// // const allTokensMapObservableAtom = atomWithObservable<TokenList>(() =>
// //   (chaindataProvider.tokensByIdObservable as Observable<TokenList>).pipe(
// //     logObservableUpdate("allTokensMapObservableAtom")
// //   )
// // )

// //export const allTokensMapAtom = atomWithObservable(() => allTokensMap$)
// // export const allTokensMapAtom = atom((get) => {
// //   get(allTokensMapSubscriptionAtom)
// //   return get(allTokensMapObservableAtom)
// // })

// //export const allTokensAtom = atomWithObservable(() => allTokens$)
// // atom(async (get) => {
// //   const [tokensMap, chainsMap, evmNetworksMap] = await Promise.all([
// //     get(allTokensMapAtom),
// //     get(allChainsMapAtom),
// //     get(allEvmNetworksMapAtom),
// //   ])
// //   return Object.values(tokensMap).filter(
// //     (token) =>
// //       (token.chain && chainsMap[token.chain.id]) ||
// //       (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
// //   )
// // })

// // const allTokensWithoutTestnetsAtom = atom(async (get) => {
// //   const [tokensMap, chainsMap, evmNetworksMap] = await Promise.all([
// //     get(allTokensMapAtom),
// //     get(allChainsWithoutTestnetsMapAtom),
// //     get(allEvmNetworksWithoutTestnetsMapAtom),
// //   ])
// //   return Object.values(tokensMap)
// //     .filter(filterNoTestnet)
// //     .filter(
// //       (token) =>
// //         (token.chain && chainsMap[token.chain.id]) ||
// //         (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])
// //     )
// // })

// // const allTokensWithoutTestnetsMapAtom = atom(async (get) => {
// //   const tokens = await get(allTokensWithoutTestnetsAtom)
// //   return Object.fromEntries(tokens.map((token) => [token.id, token]))
// // })

// // const activeTokensWithTestnetsAtom = atom(async (get) => {
// //   const [tokens, chainsMap, evmNetworksMap, activeTokens] = await Promise.all([
// //     get(allTokensAtom),
// //     get(activeChainsWithTestnetsMapAtom),
// //     get(activeEvmNetworksWithTestnetsMapAtom),
// //     get(tokensActiveAtom),
// //   ])
// //   return tokens.filter(
// //     (token) =>
// //       ((token.chain && chainsMap[token.chain.id]) ||
// //         (token.evmNetwork && evmNetworksMap[token.evmNetwork.id])) &&
// //       isTokenActive(token, activeTokens)
// //   )
// // })

// // const activeTokensWithoutTestnetsAtom = atom(async (get) => {
// //   const [arTokensWithTestnets, chainsWithoutTestnetsMap, evmNetworksWithoutTestnetsMap] =
// //     await Promise.all([
// //       get(activeTokensWithTestnetsAtom),
// //       get(activeChainsWithoutTestnetsMapAtom),
// //       get(activeEvmNetworksWithoutTestnetsMapAtom),
// //     ])
// //   return arTokensWithTestnets
// //     .filter(filterNoTestnet)
// //     .filter(
// //       (token) =>
// //         (token.chain && chainsWithoutTestnetsMap[token.chain.id]) ||
// //         (token.evmNetwork && evmNetworksWithoutTestnetsMap[token.evmNetwork.id])
// //     )
// // })

// // export const activeTokensWithTestnetsMapAtom = atomWithObservable(
// //   () => activeTokensWithTestnetsMap$
// // )
// //  atom(async (get) => {
// //   const tokens = await get(activeTokensWithTestnetsAtom)
// //   return Object.fromEntries(tokens.map((token) => [token.id, token])) as TokenList
// // })

// // const activeTokensWithoutTestnetsMapAtom = atom(async (get) => {
// //   const tokens = await get(activeTokensWithoutTestnetsAtom)
// //   return Object.fromEntries(tokens.map((token) => [token.id, token])) as TokenList
// // })

// // export type TokensQueryOptions = {
// //   activeOnly: boolean
// //   includeTestnets: boolean
// // }

// // export const tokensArrayAtomFamily = atomFamily(
// //   ({ activeOnly, includeTestnets }: ChaindataQueryOptions) =>
// //     atomWithObservable(() => getTokens$({ activeOnly, includeTestnets })),
// //   // atom((get) => {
// //   //   if (activeOnly)
// //   //     return includeTestnets
// //   //       ? get(activeTokensWithTestnetsAtom)
// //   //       : get(activeTokensWithoutTestnetsAtom)

// //   //   return includeTestnets ? get(allTokensAtom) : get(allTokensWithoutTestnetsAtom)
// //   // }),
// //   isEqual
// // )

// // export const tokensMapAtomFamily = atomFamily(
// //   ({ activeOnly, includeTestnets }: ChaindataQueryOptions) =>
// //     atomWithObservable(() => getTokensMap$({ activeOnly, includeTestnets })),
// //   // atom((get) => {
// //   //   if (activeOnly)
// //   //     return includeTestnets
// //   //       ? get(activeTokensWithTestnetsMapAtom)
// //   //       : get(activeTokensWithoutTestnetsMapAtom)

// //   //   return includeTestnets ? get(allTokensMapAtom) : get(allTokensWithoutTestnetsMapAtom)
// //   // }),
// //   isEqual
// // )

// // export const tokenByIdAtomFamily = atomFamily(
// //   (tokenId: TokenId | null | undefined) => atomWithObservable(() => getTokenById$(tokenId))
// //   // atom(async (get) => {
// //   //   if (!tokenId) return null
// //   //   const tokens = await get(allTokensMapAtom)
// //   //   return tokens[tokenId] || null
// //   // })
// // )
