/* eslint-disable no-console */
import { TokenId } from "@talismn/chaindata-provider"
import { FC } from "react"

import { useNetworkById, useToken } from "@ui/state"
import { useYieldProducts } from "@ui/state/yield"

import { ProductList } from "./components/ProductList"
import { TokenDetails } from "./components/TokenDetails"

interface EarnModalBodyProps {
  tokenId: TokenId
}

export const EarnModalBody: FC<EarnModalBodyProps> = ({ tokenId }) => {
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  // Fetch yield products - for now we get all products, later we can filter by tokenId
  const {
    data: yieldProducts = [],
    isLoading,
    error,
  } = useYieldProducts({
    tokenId,
    networkId: network?.id,
  })

  const handleProductClick = (productId: string) => {
    // eslint-disable-next-line no-console
    console.log("Product clicked:", productId, tokenId)
    // TODO: Navigate to product details or start earning process
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <TokenDetails tokenId={tokenId} tokenSymbol={token?.symbol} networkId={network?.id} />
      <ProductList
        products={yieldProducts}
        tokenId={tokenId}
        isLoading={isLoading}
        error={error}
        onProductClick={handleProductClick}
      />
    </div>
  )
}
