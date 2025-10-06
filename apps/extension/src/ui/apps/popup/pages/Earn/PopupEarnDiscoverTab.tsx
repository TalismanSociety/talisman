import { YieldProduct } from "extension-core"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { mapYieldNetworkToNetworkId } from "@ui/domains/Earn/utils/networkMapping"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useYieldProducts } from "@ui/state/yield"

interface PopupEarnProductCardProps {
  product: YieldProduct
  onProductClick: (product: YieldProduct) => void
}

const PopupEarnProductCard: FC<PopupEarnProductCardProps> = ({ product, onProductClick }) => {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      className="bg-grey-850 hover:bg-grey-800 flex w-full items-center gap-4 overflow-hidden rounded-sm p-6"
      onClick={() => onProductClick(product)}
    >
      <AssetLogo url={product.metadata.logoURI} className="size-16 shrink-0" />
      <div className="flex w-full grow flex-col gap-2 overflow-hidden text-left">
        <div className="flex w-full items-center justify-between gap-3 overflow-hidden text-sm font-bold">
          <div className="flex max-w-full items-center gap-2 overflow-hidden">
            <div className="truncate text-white" title={product.metadata.name}>
              {product.metadata.name}
            </div>
            <NetworkLogo
              networkId={mapYieldNetworkToNetworkId(product.network)}
              className="inline-block shrink-0"
            />
            <div className="text-body-secondary border-grey-500 rounded-xs shrink-0 border-[0.2rem] px-2 py-1 text-[0.8rem]">
              {product.mechanics.type.toLocaleUpperCase()}
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-2 overflow-hidden text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <AssetLogo url={product.inputTokens?.[0]?.logoURI} className="h-6 w-6" />
            <span className="truncate text-white" title={product.inputTokens?.[0]?.symbol}>
              {product.inputTokens?.[0]?.symbol}
            </span>
          </div>
          <div className="text-white">/</div>
          <div className="flex min-w-0 items-center gap-2">
            <AssetLogo url={product.outputToken?.logoURI} className="h-6 w-6" />
            <span className="truncate text-white" title={product.outputToken?.symbol}>
              {product.outputToken?.symbol}
            </span>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-2 overflow-hidden">
          <div className="text-body-secondary text-xs">{t("TVL")}</div>
          <div className="text-body text-sm font-bold">
            {product.statistics?.tvlUsd ? (
              <Fiat amount={Number(product.statistics.tvlUsd)} forceCurrency="usd" />
            ) : (
              <span className="text-body-secondary">-</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export const PopupEarnDiscoverTab: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: yieldProducts = [], isLoading, error } = useYieldProducts()

  const handleProductClick = useCallback(
    (product: YieldProduct) => {
      // Navigate to product selection page with tokenId parameter
      navigate(
        `/select-product?tokenId=${product.inputTokens?.[0]?.symbol}&productId=${product.id}`,
      )
    },
    [navigate],
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-grey-700 h-20 w-full animate-pulse rounded"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
        {t("Failed to load earning products.")}
      </div>
    )
  }

  if (!yieldProducts.length) {
    return (
      <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
        {t("No earning products available.")}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {yieldProducts.map((product) => (
        <PopupEarnProductCard
          key={product.id}
          product={product}
          onProductClick={handleProductClick}
        />
      ))}
    </div>
  )
}
