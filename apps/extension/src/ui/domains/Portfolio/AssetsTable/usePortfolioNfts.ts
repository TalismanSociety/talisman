import { nftsAtom } from "@ui/atoms/nfts"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import { NftData } from "extension-core"
import { useAtomValue } from "jotai"
import { useMemo } from "react"

import { usePortfolio } from "../usePortfolio"
import { useSelectedAccount } from "../useSelectedAccount"

export const usePortfolioNfts = () => {
  const data = useAtomValue(nftsAtom)
  const { networkFilter } = usePortfolio()
  const { account } = useSelectedAccount()
  const [includeTestnets] = useSetting("useTestnets")
  const { evmNetworksMap } = useEvmNetworks({ activeOnly: true, includeTestnets })

  // filter enabled networks (or current network if set)
  const nfts = useMemo(() => {
    const networkNfts = networkFilter
      ? data.nfts.filter((nft) => networkFilter.evmNetworkId === nft.evmNetworkId)
      : data.nfts.filter((nft) => evmNetworksMap[nft.evmNetworkId])
    const userNfts = account
      ? networkNfts.filter((nft) => nft.owner === account.address)
      : networkNfts
    return userNfts
  }, [account, data, evmNetworksMap, networkFilter])

  const collections = useMemo(() => {
    const collectionIds = new Set(nfts.map((nft) => nft.collectionId))
    return data.collections.filter((c) => collectionIds.has(c.id))
  }, [nfts, data])

  // TODO filter all/recent/favorites/hidden

  // TODO sort value / Name / Network

  return { ...data, collections, nfts } as NftData
}
