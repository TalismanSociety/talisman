import { ChevronDownIcon, ChevronRightIcon } from "@talismn/icons"
import { YieldDto } from "extension-core"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"

import { DiscoverProductCard } from "./DiscoverProductCard"

interface DiscoverTokenRowProps {
  tokenSymbol: string
  tokenLogoURI?: string
  networkId: string
  totalBalance: number
  totalBalanceUsd: number
  products: YieldDto[]
  onProductClick: (product: YieldDto) => void
  isPopup?: boolean
}

export const DiscoverTokenRow: FC<DiscoverTokenRowProps> = ({
  tokenSymbol,
  tokenLogoURI,
  networkId,
  totalBalance,
  totalBalanceUsd,
  products,
  onProductClick,
  isPopup = false,
}) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  const handleProductClick = useCallback(
    (product: YieldDto) => {
      onProductClick(product)
    },
    [onProductClick],
  )

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
            <div className="text-body-secondary text-xs">
              {products.length}{" "}
              {products.length === 1 ? t("Available product") : t("Available products")}
            </div>
          </div>
        </div>

        {/* Right section - Balance and Expand Icon */}
        <div className="flex min-w-0 flex-shrink-0 items-center gap-4">
          <div className="flex min-w-0 flex-col items-end gap-1">
            {/* Token Amount */}
            <div className="text-body-secondary truncate text-right text-xs">
              {totalBalance.toLocaleString()} {tokenSymbol}
            </div>
            {/* Fiat Amount */}
            <div className="text-body truncate text-right text-sm font-bold">
              <Fiat amount={totalBalanceUsd} forceCurrency="usd" />
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
          {products.map((product) => (
            <DiscoverProductCard
              key={product.id}
              product={product}
              onProductClick={handleProductClick}
              isPopup={isPopup}
            />
          ))}
        </div>
      )}
    </div>
  )
}
