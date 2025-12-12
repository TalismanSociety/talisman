import { TokenId } from "@talismn/chaindata-provider"
import { YieldDto } from "extension-core"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { ShowMoreButton } from "./DiscoverTab/ShowMoreButton"
import { ProductItem } from "./ProductItem"

interface ProductListProps {
  products: YieldDto[]
  tokenId: TokenId
  isLoading: boolean
  error: unknown
  onProductClick: (product: YieldDto) => void
  hasMoreProducts?: boolean
  onShowMore?: () => void
}

export const ProductList: FC<ProductListProps> = ({
  products,
  tokenId,
  isLoading,
  error,
  onProductClick,
  hasMoreProducts,
  onShowMore,
}) => {
  const { t } = useTranslation()

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
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
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
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
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
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

  // Filter products based on status and availability
  const availableProducts = products.filter(
    (product) =>
      product.status.enter && !product.metadata.underMaintenance && !product.metadata.deprecated,
  )

  // Sort by APY (highest first)
  const sortedProducts = availableProducts.sort((a, b) => b.rewardRate.total - a.rewardRate.total)

  // Show products list
  return (
    <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
      <div className="space-y-3 pb-4">
        {sortedProducts.map((product) => (
          <ProductItem
            key={product.id}
            product={product}
            tokenId={tokenId}
            onClick={onProductClick}
          />
        ))}
        {hasMoreProducts && onShowMore && (
          <ShowMoreButton onClick={onShowMore} isFetching={false} isPopup={false} />
        )}
      </div>
    </div>
  )
}
