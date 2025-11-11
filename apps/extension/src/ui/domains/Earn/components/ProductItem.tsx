import { classNames } from "@talismn/util"
import { YieldDto } from "extension-core"
import { FC } from "react"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"

interface ProductItemProps {
  product: YieldDto
  tokenId?: string
  onClick: (product: YieldDto) => void
}

export const ProductTokenLogo: FC<{
  protocolLogo: string | null
  tokenId?: string
  className?: string
}> = ({ protocolLogo, tokenId, className }) => {
  return (
    <div className={classNames("relative block aspect-square w-[1em] shrink-0", className)}>
      {/* Main product logo */}
      <AssetLogo url={protocolLogo} className="h-full w-full" />

      {/* Small token logo in top-right corner with boundary */}
      <div className="absolute -right-[0.25rem] -top-[0.25rem] h-[1em] w-[1em] overflow-hidden rounded-full border-2 border-black">
        <TokenLogo tokenId={tokenId} className="h-full w-full" />
      </div>
    </div>
  )
}

export const ProductItem: FC<ProductItemProps> = ({ product, tokenId, onClick }) => {
  const { metadata, rewardRate, statistics } = product
  const name = metadata.name
  const description = metadata.description
  const apy = rewardRate.total * 100 // Convert decimal to percentage
  const protocolLogo = metadata.logoURI

  const formatTvl = () => {
    if (!statistics?.tvlUsd) return "N/A"

    const tvl = parseFloat(statistics.tvlUsd)
    if (tvl >= 1e9) {
      return `$${(tvl / 1e9).toFixed(1)}B`
    } else if (tvl >= 1e6) {
      return `$${(tvl / 1e6).toFixed(1)}M`
    } else if (tvl >= 1e3) {
      return `$${(tvl / 1e3).toFixed(1)}K`
    } else {
      return `$${tvl.toFixed(0)}`
    }
  }

  return (
    <button
      type="button"
      className="text-body-secondary bg-grey-850 hover:bg-grey-800 flex h-[6.6rem] w-full items-center justify-between overflow-hidden rounded p-4 text-left text-base transition-colors"
      onClick={() => onClick(product)}
      onKeyDown={(e) => ["Enter", " "].includes(e.key) && onClick(product)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
            <ProductTokenLogo
              protocolLogo={protocolLogo}
              tokenId={tokenId || undefined}
              className="h-14 w-14"
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
            <div className="max-w-[200px] truncate text-sm font-bold text-white" title={name}>
              {name}
            </div>
          </div>
          <div className="text-grey-600 max-w-[200px] truncate text-xs" title={description}>
            {description}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">APY</span>
          <span
            className="text-primary max-w-[80px] truncate text-xs font-normal"
            title={`${apy.toFixed(2)}%`}
          >
            {apy.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">TVL</span>
          <span
            className="max-w-[80px] truncate text-xs font-normal text-white"
            title={formatTvl()}
          >
            {formatTvl()}
          </span>
        </div>
      </div>
    </button>
  )
}
