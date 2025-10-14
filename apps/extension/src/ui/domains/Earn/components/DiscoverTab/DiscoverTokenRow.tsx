import { ChevronDownIcon, ChevronRightIcon } from "@talismn/icons"
import { YieldDto } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useNetworkById } from "@ui/state"

import { ProductItem } from "../ProductItem"
import { ShowMoreButton } from "./ShowMoreButton"

interface DiscoverTokenRowProps {
  tokenSymbol: string
  tokenLogoURI?: string
  networkId: string
  products: YieldDto[]
  onProductClick: (product: YieldDto) => void
  isPopup?: boolean
  // Client-side pagination props
  isLoading?: boolean
  hasMoreProducts?: boolean
  onShowMore?: () => void
}

export const DiscoverTokenRow: FC<DiscoverTokenRowProps> = ({
  tokenSymbol,
  tokenLogoURI,
  networkId,
  products,
  onProductClick,
  isPopup = false,
  isLoading = false,
  hasMoreProducts,
  onShowMore,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const network = useNetworkById(networkId)

  const handleToggle = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  const handleProductClick = useCallback(
    (product: YieldDto) => {
      onProductClick(product)
    },
    [onProductClick],
  )

  const maxRewardRate = useMemo(() => {
    return products.length > 0
      ? Math.max(...products.map((p) => p.rewardRate?.total || 0)) * 100
      : 0
  }, [products])

  return (
    <div className="bg-grey-850 flex w-full flex-col gap-3">
      {/* Token Row - matching existing patterns */}
      <button
        type="button"
        onClick={handleToggle}
        className={`text-body-secondary bg-grey-850 hover:bg-grey-800 flex w-full items-center gap-6 overflow-hidden rounded p-6 text-left ${
          isPopup ? "text-sm" : "text-base"
        }`}
      >
        {/* Left section - Logo and Token Info */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="shrink-0 text-xl">
            <AssetLogo tokenId={undefined} url={tokenLogoURI || null} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="text-body flex min-w-0 items-center gap-2 text-sm font-bold">
              <div className="truncate" title={tokenSymbol}>
                {tokenSymbol}
              </div>
              <NetworkLogo networkId={networkId} className="shrink-0 text-[1rem]" />
            </div>
            <div className="text-body-secondary text-xs">{network?.name || networkId}</div>
          </div>
        </div>

        {/* Right section - APY and Expand Icon */}
        <div className="flex min-w-0 flex-shrink-0 items-center gap-4">
          <div className="flex min-w-0 flex-col items-end gap-1">
            {/* Max APY */}
            <div className="text-body-secondary truncate text-right text-xs">
              {products.length > 0 ? (
                <>
                  APY up to <span className="text-primary">{maxRewardRate.toFixed(2)}%</span>
                </>
              ) : (
                "No yields available"
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            {isExpanded ? (
              <ChevronDownIcon className="h-8 w-8 text-white" />
            ) : (
              <ChevronRightIcon className="h-8 w-8 text-white" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Products - part of same row background */}
      {isExpanded && (
        <div
          className={`bg-grey-850 flex flex-col gap-4 pb-4 ${isPopup ? "pl-6 pr-6" : "pl-8 pr-8"}`}
        >
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-grey-700 h-16 w-full animate-pulse rounded"></div>
              ))}
            </div>
          ) : (
            <>
              {products.map((product) => (
                <ProductItem key={product.id} product={product} onClick={handleProductClick} />
              ))}
              {hasMoreProducts && onShowMore && (
                <ShowMoreButton onClick={onShowMore} isFetching={false} isPopup={isPopup} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
