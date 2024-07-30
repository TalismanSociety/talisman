import { useAtom, useAtomValue } from "jotai"
import { useMemo } from "react"

import {
  nftsAtom,
  nftsNetworkFilterAtom,
  nftsNetworkOptionsAtom,
  nftsPortfolioSearchAtom,
} from "@ui/atoms/nfts"

export const usePortfolioNftsSearch = () => {
  const [search, setSearch] = useAtom(nftsPortfolioSearchAtom)
  return { search, setSearch }
}

export const usePortfolioNftsNetwork = () => {
  const [networkFilter, setNetworkFilter] = useAtom(nftsNetworkFilterAtom)
  const networks = useAtomValue(nftsNetworkOptionsAtom)

  return { networks, networkFilter, setNetworkFilter }
}

export const usePortfolioNfts = () => useAtomValue(nftsAtom)

export const usePortfolioNftCollection = (collectionId: string | null | undefined) => {
  const { collections, nfts: allNfts } = usePortfolioNfts()

  return useMemo(
    () => ({
      collection: collections.find((c) => c.id === collectionId) ?? null,
      nfts: allNfts.filter((nft) => nft.collectionId === collectionId) ?? [],
    }),
    [collections, allNfts, collectionId]
  )
}
