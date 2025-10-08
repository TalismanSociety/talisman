import { classNames } from "@talismn/util"
import { YieldDto } from "extension-core"
import { FC } from "react"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"

interface ProductItemProps {
  product: YieldDto
  tokenId: string
  onClick: (product: YieldDto) => void
}

const ProductTokenLogo: FC<{
  protocolLogo: string | null
  tokenId: string
  className?: string
}> = ({ protocolLogo, tokenId, className }) => {
  return (
    <div className={classNames("relative block aspect-square w-[1em] shrink-0", className)}>
      {/* Main product logo */}
      <AssetLogo url={protocolLogo} className="h-full w-full" />

      {/* Small token logo in top-right corner */}
      <div className="absolute right-0 top-0 h-1/2 w-1/2 rounded-full bg-white p-0.5">
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
            <ProductTokenLogo protocolLogo={protocolLogo} tokenId={tokenId} className="h-14 w-14" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-bold text-white">{name}</div>
          </div>
          <div className="text-grey-600 truncate text-xs">{description}</div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">APY</span>
          <span className="text-primary text-xs font-normal">{apy.toFixed(2)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">TVL</span>
          <span className="text-xs font-normal text-white">{formatTvl()}</span>
        </div>
      </div>
    </button>
  )
}
