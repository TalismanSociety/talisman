import { NftData } from "extension-core"
import { atom } from "jotai"
import { atomFamily } from "jotai/utils"

import { api } from "@ui/api"

import { accountsByCategoryAtomFamily } from "./accounts"
import { evmNetworksArrayAtomFamily } from "./chaindata"
import { NetworkOption, portfolioAccountAtom } from "./portfolio"
import { settingsAtomFamily } from "./settings"
import { atomWithDebounce } from "./utils/atomWithDebounce"
import { atomWithSubscription } from "./utils/atomWithSubscription"

const nftDataAtom = atomWithSubscription(api.nftsSubscribe, {
  debugLabel: "nftDataAtom",
  refCount: true,
})

export const nftsNetworkOptionsAtom = atom(async (get) => {
  const includeTestnets = (await get(settingsAtomFamily("useTestnets"))) as boolean
  const [{ nfts, collections }, evmNetworks] = await Promise.all([
    get(nftDataAtom),
    get(evmNetworksArrayAtomFamily({ activeOnly: true, includeTestnets })),
  ])

  const networkIdsWithNfts = [
    ...new Set(
      nfts.map((nft) => nft.evmNetworkId).concat(...collections.map((c) => c.evmNetworkIds))
    ),
  ]

  return evmNetworks
    .filter((network) => networkIdsWithNfts.includes(network.id))
    .map<NetworkOption>((evmNetwork) => {
      return {
        id: evmNetwork.substrateChain?.id ?? evmNetwork.id,
        name: evmNetwork.name ?? `Network ${evmNetwork.id}`,
        evmNetworkId: evmNetwork.id,
        sortIndex: evmNetwork.sortIndex,
      }
    })
})

export const nftsNetworkFilterAtom = atom<NetworkOption | undefined>(undefined)

export enum NftVisibilityFilter {
  Default = "Default",
  Hidden = "Hidden",
  Favorites = "Favorites",
}

export const nftsVisibilityFilterAtom = atom<NftVisibilityFilter>(NftVisibilityFilter.Default)

export const { debouncedValueAtom: nftsPortfolioSearchAtom } = atomWithDebounce<string>("")

export const nftsAtom = atom(async (get) => {
  const [
    { status, nfts: allNfts, collections: allCollections, hiddenNftCollectionIds, favoriteNftIds },
    accounts,
    networks,
  ] = await Promise.all([
    get(nftDataAtom),
    get(accountsByCategoryAtomFamily("portfolio")),
    get(nftsNetworkOptionsAtom),
  ])

  const visibility = get(nftsVisibilityFilterAtom)
  const account = get(portfolioAccountAtom)
  const networkFilter = get(nftsNetworkFilterAtom)
  const lowerSearch = get(nftsPortfolioSearchAtom).toLowerCase()

  const addresses = account
    ? [account.address.toLowerCase()]
    : accounts.map((a) => a.address.toLowerCase())

  const networkIds = networkFilter
    ? [networkFilter.evmNetworkId]
    : networks.map((n) => n.evmNetworkId)

  const nfts = allNfts
    // account filter
    .filter((nft) => nft.owner && addresses.includes(nft.owner.toLowerCase()))

    // visibility mode
    .filter((nft) => {
      if (visibility === NftVisibilityFilter.Hidden)
        return hiddenNftCollectionIds.includes(nft.collectionId)
      if (visibility === NftVisibilityFilter.Favorites) return favoriteNftIds.includes(nft.id)
      return !hiddenNftCollectionIds.includes(nft.collectionId)
    })

    // network filter
    .filter((nft) => networkIds.includes(nft.evmNetworkId))

    // search filter
    .filter((nft) => {
      if (!lowerSearch) return true
      const collection = allCollections.find((c) => c.id === nft.collectionId)
      return (
        collection?.name?.toLowerCase().includes(lowerSearch) ||
        collection?.description?.toLowerCase().includes(lowerSearch) ||
        nft.name?.toLowerCase().includes(lowerSearch) ||
        nft.description?.toLowerCase().includes(lowerSearch)
      )
    })

    .sort((n1, n2) => {
      const isFavorite1 = favoriteNftIds.includes(n1.id)
      const isFavorite2 = favoriteNftIds.includes(n2.id)
      if (isFavorite1 !== isFavorite2) return (isFavorite2 ? 1 : 0) - (isFavorite1 ? 1 : 0)

      const collectionName1 = allCollections.find((c) => c.id === n1.collectionId)?.name
      const collectionName2 = allCollections.find((c) => c.id === n2.collectionId)?.name
      if (!!collectionName1 && !!collectionName2 && collectionName1 !== collectionName2)
        return collectionName1.localeCompare(collectionName2)

      try {
        // if same collection, sort by tokenId
        const tokenId1 = Number(n1.tokenId)
        const tokenId2 = Number(n2.tokenId)
        if (!isNaN(tokenId1) && !isNaN(tokenId2)) {
          return tokenId1 - tokenId2
        }
      } catch (err) {
        //ignore
      }

      return 0
    })

  const collectionIds = new Set(nfts.map((nft) => nft.collectionId))
  const collections = allCollections
    .filter((c) => collectionIds.has(c.id))
    .sort((c1, c2) => {
      const hasFavoriteNfts = nfts
        .filter((n) => n.collectionId === c1.id)
        .some((n) => favoriteNftIds.includes(n.id))
      const hasFavoriteNfts2 = nfts
        .filter((n) => n.collectionId === c2.id)
        .some((n) => favoriteNftIds.includes(n.id))
      if (hasFavoriteNfts !== hasFavoriteNfts2) return hasFavoriteNfts2 ? 1 : -1

      return (c1.name ?? "").localeCompare(c2.name ?? "")
    })

  return { status, nfts, collections, favoriteNftIds, hiddenNftCollectionIds } as NftData
})

export const isHiddenNftCollectionAtomFamily = atomFamily((id: string) =>
  atom(async (get) => {
    const { hiddenNftCollectionIds } = await get(nftDataAtom)
    return hiddenNftCollectionIds.includes(id)
  })
)

export const isFavoriteNftAtomFamily = atomFamily((id: string) =>
  atom(async (get) => {
    const { favoriteNftIds } = await get(nftDataAtom)
    return favoriteNftIds.includes(id)
  })
)

export const nftDataAtomFamily = atomFamily((id: string | null) =>
  atom(async (get) => {
    const { nfts, collections } = await get(nftDataAtom)
    const nft = nfts.find((nft) => nft.id === id)
    if (!nft) return null
    const collection = collections.find((c) => c.id === nft.collectionId)
    if (!collection) return null
    return { nft, collection }
  })
)
