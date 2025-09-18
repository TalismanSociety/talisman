import { TokenId } from "@talismn/chaindata-provider"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { ProductItem } from "./ProductItem"

interface YieldProduct {
  id: string
  name: string
  description: string
  apy: number
  tvl: string
  protocolLogo: string | null
}

interface ProductListProps {
  products: YieldProduct[]
  tokenId: TokenId
  isLoading: boolean
  error: Error | null
  onProductClick: (productId: string) => void
}

export const ProductList: FC<ProductListProps> = ({
  products,
  tokenId,
  isLoading,
  error,
  onProductClick,
}) => {
  const { t } = useTranslation()

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 pb-4">
          <div className="flex h-32 items-center justify-center">
            <div className="py-8 text-center text-gray-400">
              {t("Loading earning opportunities...")}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 pb-4">
          <div className="flex h-32 items-center justify-center">
            <div className="py-8 text-center text-gray-400">
              {t("Failed to load earning opportunities. Please try again.")}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state
  if (products.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 pb-4">
          <div className="flex h-32 items-center justify-center">
            <div className="py-8 text-center text-gray-400">
              {t("No earning opportunities available for this token.")}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show products list
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-3 pb-4">
        {products.map((product) => (
          <ProductItem
            key={product.id}
            id={product.id}
            name={product.name}
            description={product.description}
            apy={product.apy}
            tvl={product.tvl}
            tokenId={tokenId}
            onClick={onProductClick}
          />
        ))}
      </div>
    </div>
  )
}
