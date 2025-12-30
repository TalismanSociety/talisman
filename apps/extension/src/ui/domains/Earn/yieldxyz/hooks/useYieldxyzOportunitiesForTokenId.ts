import { parseTokenId, TokenId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

import { useYieldxyzProducts } from "@ui/state"

import { useGetYieldxyzToken } from "./useGetYieldxyzToken"

export const useYieldxyzOpportunitiesForTokenId = (tokenId: TokenId) => {
  const { data: allProducts } = useYieldxyzProducts()

  const { getYieldxyzTokenId } = useGetYieldxyzToken()

  return useMemo(() => {
    return (
      allProducts
        ?.filter((product) => {
          // here we consider a product can only have one input token id.
          // if technically it has multiple, then pick the native token from the list (we ensure at the store level that if multiple input tokens, one is a native token)
          const inputTokenIds = product.inputTokens
            ?.map((inputToken) => getYieldxyzTokenId(inputToken))
            .filter(isNotNil) as TokenId[]

          const inputTokenId =
            inputTokenIds.length === 1
              ? inputTokenIds[0]
              : inputTokenIds.find((tokenId) =>
                  ["evm-native", "substrate-native", "sol-native"].includes(
                    parseTokenId(tokenId).type,
                  ),
                )

          return inputTokenId === tokenId
        })
        .sort((a, b) => (a.rewardRate.total < b.rewardRate.total ? 1 : -1)) ?? []
    )
  }, [allProducts, getYieldxyzTokenId, tokenId])
}
