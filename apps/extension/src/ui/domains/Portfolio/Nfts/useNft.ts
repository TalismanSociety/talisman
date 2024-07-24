import { useAtomValue } from "jotai"
import { useMemo } from "react"

import { nftsAtom } from "@ui/atoms"

export const useNft = (id: string | null) => {
  const { nfts, collections } = useAtomValue(nftsAtom)

  return useMemo(() => {
    if (!id) return null

    const nft = nfts.find((nft) => nft.id === id)
    if (!nft) return null
    const collection = collections.find((c) => c.id === nft.collectionId)
    if (!collection) return null
    return { nft, collection }
  }, [id, nfts, collections])
}
