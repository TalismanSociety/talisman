import { TokenId } from "@talismn/chaindata-provider"
import { FC } from "react"

import { TokenLogo } from "@ui/domains/Asset/TokenLogo"

interface ProductItemProps {
  id: string
  name: string
  description: string
  apy: number
  tvl: string
  tokenId: TokenId
  onClick: (productId: string) => void
}

export const ProductItem: FC<ProductItemProps> = ({
  id,
  name,
  description,
  apy,
  tvl,
  tokenId,
  onClick,
}) => {
  const getApyColor = () => {
    // Always use the same color for APY value
    return "text-[#D5FF5C]"
  }

  return (
    <button
      type="button"
      className="text-body-secondary bg-grey-850 hover:bg-grey-800 flex h-[6.6rem] w-full items-center justify-between overflow-hidden rounded p-4 text-left text-base transition-colors"
      onClick={() => onClick(id)}
      onKeyDown={(e) => ["Enter", " "].includes(e.key) && onClick(id)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
            <TokenLogo tokenId={tokenId} className="h-10 w-10" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="truncate text-sm font-bold text-white">{name}</div>
          <div className="truncate text-xs text-[#5A5A5A]">{description}</div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5A5A5A]">APY</span>
          <span className={`text-sm font-semibold ${getApyColor()}`}>{apy.toFixed(2)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5A5A5A]">TVL</span>
          <span className="text-xs text-[#5A5A5A]">{tvl}</span>
        </div>
      </div>
    </button>
  )
}
