import { bind } from "@react-rxjs/core"
import { isAddressEqual } from "@talismn/crypto"
import { NftData } from "extension-core"
import { BehaviorSubject, combineLatest, map, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"
import { getNftCollectionLastUpdatedAt } from "@ui/domains/Portfolio/Nfts/helpers"

import { getAccountsByCategory$ } from "./accounts"
import { getChains$, getEvmNetworks$ } from "./chaindata"
import { NetworkOption, portfolioSelectedAccounts$ } from "./portfolio"
import { getSettingValue$ } from "./settings"
import { debugObservable } from "./util/debugObservable"

export enum NftVisibilityFilter {
  Default = "Default",
  Hidden = "Hidden",
  Favorites = "Favorites",
}

const nftNetworkFilter$ = new BehaviorSubject<NetworkOption | undefined>(undefined)

export const [useNftNetworkFilter] = bind(nftNetworkFilter$)

export const setNftNetworkFilter = (network: NetworkOption | undefined) =>
  nftNetworkFilter$.next(network)

const nftSearch$ = new BehaviorSubject<string>("")

export const [useNftSearch] = bind(nftSearch$)

export const setNftSearch = (search: string) => nftSearch$.next(search)

const nftsVisibilityFilter$ = new BehaviorSubject<NftVisibilityFilter>(NftVisibilityFilter.Default)

export const [useNftsVisibilityFilter] = bind(nftsVisibilityFilter$)

export const setNftsVisibilityFilter = (filter: NftVisibilityFilter) =>
  nftsVisibilityFilter$.next(filter)

const nftData$ = new Observable<NftData>((subscriber) => {
  const unsubscribe = api.nftsSubscribe((data) => {
    subscriber.next(data)
  })
  return () => {
    unsubscribe()
  }
}).pipe(
  debugObservable("nftData$", true),
  // backend subscription must be active only when this observable is subscribed
  // => all bind() calls using this observable will need a default value or they will never unsubscribe
  shareReplay({ refCount: true, bufferSize: 1 }),
)

const evmNetworks$ = getEvmNetworks$({ activeOnly: true, includeTestnets: true })
const chains$ = getChains$({ activeOnly: true, includeTestnets: true })

export const [useNftNetworkOptions, nftNetworkOptions$] = bind(
  combineLatest([evmNetworks$, chains$, nftData$]).pipe(
    map(([evmNetworks, chains, { nfts }]) => {
      const networkIdsWithNfts = [...new Set(nfts.map((nft) => nft.networkId))]

      const evmNetworkOptions = evmNetworks
        .filter((network) => networkIdsWithNfts.includes(network.id))
        .map<NetworkOption>((evmNetwork) => {
          return {
            id: evmNetwork.substrateChain?.id ?? evmNetwork.id,
            name: evmNetwork.name ?? `Network ${evmNetwork.id}`,
            evmNetworkId: evmNetwork.id,
          }
        })

      const chainOptions = chains
        .filter((chain) => networkIdsWithNfts.includes(chain.id))
        .map<NetworkOption>((chain) => {
          return {
            id: chain.id,
            name: chain.name ?? `Chain ${chain.id}`,
            evmNetworkId: chain.id,
          }
        })
      return [...evmNetworkOptions, ...chainOptions]
    }),
  ),
  [],
)

export const [useNfts, nfts$] = bind(
  combineLatest([
    nftData$,
    getAccountsByCategory$("portfolio"),
    nftNetworkOptions$,
    getSettingValue$("nftsSortBy"),
    portfolioSelectedAccounts$,
    nftsVisibilityFilter$,
    nftNetworkFilter$,
    nftSearch$,
  ]).pipe(
    map(
      ([
        {
          status,
          nfts: allNfts,
          collections: allCollections,
          hiddenNftCollectionIds,
          favoriteNftIds,
        },
        accounts,
        networks,
        sortBy,
        selectedAccounts,
        visibility,
        networkFilter,
        search,
      ]) => {
        const lowerSearch = search.toLowerCase()

        const addresses = selectedAccounts
          ? selectedAccounts.map((a) => a.address)
          : accounts.map((a) => a.address)

        const networkIds = networkFilter
          ? [networkFilter.evmNetworkId]
          : networks.map((n) => n.evmNetworkId ?? n.chainId)

        const nfts = allNfts
          // account filter
          .filter((nft) =>
            Object.entries(nft.owners).some(([address]) =>
              addresses.some((a) => isAddressEqual(a, address)),
            ),
          )

          // visibility mode
          .filter((nft) => {
            if (visibility === NftVisibilityFilter.Hidden)
              return hiddenNftCollectionIds.includes(nft.collectionId)
            if (visibility === NftVisibilityFilter.Favorites) return favoriteNftIds.includes(nft.id)
            return !hiddenNftCollectionIds.includes(nft.collectionId)
          })

          // network filter
          .filter((nft) => networkIds.includes(nft.networkId))

          // search filter
          .filter((nft) => {
            if (!lowerSearch) return true
            const collection = allCollections.find((c) => c.id === nft.collectionId)
            return (
              collection?.name?.toLowerCase().includes(lowerSearch) ||
              collection?.description?.toLowerCase().includes(lowerSearch) ||
              nft.name?.toLowerCase().includes(lowerSearch)
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
                const last1 = n1.updatedAt
                const last2 = n2.updatedAt
                if (last1 && last2) {
                  const d1 = new Date(last1).getTime()
                  const d2 = new Date(last2).getTime()
                  if (d1 !== d2) return d2 - d1
                }
                break
              }

              case "name": {
                return (n1.name ?? "").localeCompare(n2.name ?? "")
              }

              case "value": {
                if (n1.price !== n2.price) return (n2.price ?? 0) - (n1.price ?? 0)

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

            return n1.id.localeCompare(n2.id) // if nothing else, sort by id.
          })

        const collectionIds = new Set(nfts.map((nft) => nft.collectionId))
        const lastUpdatedPerCollection = new Map<string, number | null>()
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
                if (!lastUpdatedPerCollection.has(c1.id))
                  lastUpdatedPerCollection.set(c1.id, getNftCollectionLastUpdatedAt(c1, nfts))

                if (!lastUpdatedPerCollection.has(c1.id))
                  lastUpdatedPerCollection.set(c1.id, getNftCollectionLastUpdatedAt(c2, nfts))

                const lastUpdated1 = lastUpdatedPerCollection.get(c1.id)
                const lastUpdated2 = lastUpdatedPerCollection.get(c2.id)

                if (lastUpdated1 && lastUpdated2) return lastUpdated2 - lastUpdated1

                break
              }

              case "name": {
                if (c1.name !== c2.name) return (c1.name ?? "").localeCompare(c2.name ?? "")
                break
              }

              case "value": {
                const nfts1 = allNfts.filter((n) => n.collectionId === c1.id)
                const nfts2 = allNfts.filter((n) => n.collectionId === c2.id)

                const v1 = nfts1.reduce((acc, n) => acc + (n.price ?? 0), 0)
                const v2 = nfts2.reduce((acc, n) => acc + (n.price ?? 0), 0)

                if (v1 !== v2) return (v2 ?? 0) - (v1 ?? 0)

                break
              }
            }

            return c1.id.localeCompare(c2.id) // if nothing else, sort by id.
          })

        return { status, nfts, collections, favoriteNftIds, hiddenNftCollectionIds } as NftData
      },
    ),
  ),
  {
    status: "loading",
    nfts: [],
    collections: [],
    favoriteNftIds: [],
    hiddenNftCollectionIds: [],
    timestamp: 0,
  } as NftData,
)

export const [useNft, nft$] = bind(
  (id: string | null) =>
    nftData$.pipe(
      map(({ nfts, collections }) => {
        if (!id) return null

        const nft = nfts.find((nft) => nft.id === id)
        if (!nft) return null

        const collection = collections.find((c) => c.id === nft.collectionId)
        if (!collection) return null

        return { nft, collection }
      }),
    ),
  null,
)

export const [useIsHiddenNftCollection, getIsHiddenNftCollection$] = bind(
  (id: string) => nfts$.pipe(map((data) => data.hiddenNftCollectionIds.includes(id))),
  false,
)

export const [useIsFavoriteNft, getIsFavoriteNft$] = bind(
  (id: string) => nfts$.pipe(map((data) => data.favoriteNftIds.includes(id))),
  false,
)

export const [useNftCollection, getNftCollection$] = bind(
  (collectionId: string | null | undefined) =>
    nfts$.pipe(
      map(({ collections, nfts: allNfts }) => ({
        collection: collections.find((c) => c.id === collectionId) ?? null,
        nfts: allNfts.filter((nft) => nft.collectionId === collectionId) ?? [],
      })),
    ),
  { collection: null, nfts: [] },
)
