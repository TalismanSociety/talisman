import { NftData, SettingsStoreData } from "extension-core"
import { atom } from "jotai"
import { atomFamily } from "jotai/utils"

import { api } from "@ui/api"
import {
  getNftCollectionFloorUsd,
  getNftCollectionLastAcquiredAt,
  getNftLastAcquiredAt,
} from "@ui/domains/Portfolio/Nfts/helpers"

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
    nftsSortBy,
  ] = await Promise.all([
    get(nftDataAtom),
    get(accountsByCategoryAtomFamily("portfolio")),
    get(nftsNetworkOptionsAtom),
    get(settingsAtomFamily("nftsSortBy")),
  ])

  const sortBy = nftsSortBy as SettingsStoreData["nftsSortBy"]

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
    .filter((nft) => nft.owners.some(({ address }) => addresses.includes(address.toLowerCase())))

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

      const collection1 = allCollections.find((c) => c.id === n1.collectionId)
      const collection2 = allCollections.find((c) => c.id === n2.collectionId)

      switch (sortBy) {
        case "date": {
          const last1 = getNftLastAcquiredAt(n1)
          const last2 = getNftLastAcquiredAt(n2)
          const d1 = new Date(last1).getTime()
          const d2 = new Date(last2).getTime()
          if (d1 !== d2) return d2 - d1
          break
        }

        case "name": {
          return (n1.name ?? "").localeCompare(n2.name ?? "")
        }

        case "floor": {
          if (!collection1 || !collection2) return 0

          const f1 = getNftCollectionFloorUsd(collection1)
          const f2 = getNftCollectionFloorUsd(collection2)

          if (f1 !== f2) return (f2 ?? 0) - (f1 ?? 0)

          break
        }
      }

      const collectionName1 = collection1?.name
      const collectionName2 = collection2?.name
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
  const lastAcquiredPerCollection = new Map<string, string | null>()
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

      switch (sortBy) {
        case "date": {
          if (!lastAcquiredPerCollection.has(c1.id))
            lastAcquiredPerCollection.set(c1.id, getNftCollectionLastAcquiredAt(c1, nfts))

          if (!lastAcquiredPerCollection.has(c1.id))
            lastAcquiredPerCollection.set(c1.id, getNftCollectionLastAcquiredAt(c2, nfts))

          const lastAcquired1 = lastAcquiredPerCollection.get(c1.id)
          const lastAcquired2 = lastAcquiredPerCollection.get(c2.id)

          if (lastAcquired1 && lastAcquired2) return lastAcquired2.localeCompare(lastAcquired1)

          break
        }

        case "name": {
          return (c1.name ?? "").localeCompare(c2.name ?? "")
        }

        case "floor": {
          const f1 = getNftCollectionFloorUsd(c1)
          const f2 = getNftCollectionFloorUsd(c2)

          if (f1 !== f2) return (f2 ?? 0) - (f1 ?? 0)

          break
        }
      }

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
