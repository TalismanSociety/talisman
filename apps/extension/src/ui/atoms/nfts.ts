import { api } from "@ui/api"
import { NftData } from "extension-core"
import { atom } from "jotai"

import { accountsByCategoryAtomFamily } from "./accounts"
import { evmNetworksArrayAtomFamily } from "./chaindata"
import { NetworkOption, portfolioAccountAtom } from "./portfolio"
import { settingsAtomFamily } from "./settings"
import { atomWithDebounce } from "./utils/atomWithDebounce"
import { atomWithSubscription } from "./utils/atomWithSubscription"

export const allNftsAtom = atomWithSubscription(api.nftsSubscribe, "nftsAtom")

export const nftsNetworkOptionsAtom = atom(async (get) => {
  const includeTestnets = (await get(settingsAtomFamily("useTestnets"))) as boolean
  const [{ nfts, collections }, evmNetworks] = await Promise.all([
    get(allNftsAtom),
    get(evmNetworksArrayAtomFamily({ activeOnly: true, includeTestnets })),
  ])

  const networkIdsWithNfts = [
    ...new Set(
      nfts.map((nft) => nft.evmNetworkId).concat(...collections.map((c) => c.evmNetworkIds))
    ),
  ]

  return evmNetworks
    .filter((network) => networkIdsWithNfts.includes(network.id))
    .map<NetworkOption>((evmNetwork) => ({
      id: evmNetwork.id,
      name: evmNetwork.name ?? `Network ${evmNetwork.id}`,
      evmNetworkId: evmNetwork.id,
      sortIndex: evmNetwork.sortIndex,
    }))
})

export const nftsNetworkFilterAtom = atom<NetworkOption | undefined>(undefined)

export const { debouncedValueAtom: nftsPortfolioSearchAtom } = atomWithDebounce<string>("")

export const nftsAtom = atom(async (get) => {
  const { status, nfts: allNfts, collections: allCollections } = await get(allNftsAtom)
  const accounts = await get(accountsByCategoryAtomFamily("portfolio"))
  const account = get(portfolioAccountAtom)
  const networkFilter = get(nftsNetworkFilterAtom)
  const lowerSearch = get(nftsPortfolioSearchAtom).toLowerCase()

  const addresses = account
    ? [account.address.toLowerCase()]
    : accounts.map((a) => a.address.toLowerCase())

  const nfts = allNfts
    // account filter
    .filter((nft) => nft.owner && addresses.includes(nft.owner.toLowerCase()))

    // network filter
    .filter((nft) => (networkFilter ? nft.evmNetworkId === networkFilter.evmNetworkId : true))

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

  const collectionIds = new Set(nfts.map((nft) => nft.collectionId))
  const collections = allCollections.filter((c) => collectionIds.has(c.id))

  return { status, nfts, collections } as NftData
})
