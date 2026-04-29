import type { Address } from "@core/types/base"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"

import { PortfolioAccount } from "../PortfolioAccount"

type AssetStateProps = {
  title: string
  description?: string
  render: boolean
  address?: Address
  isLoading?: boolean
  locked?: boolean
}

export const AssetState = ({
  title,
  description,
  render,
  address,
  isLoading,
  locked,
}: AssetStateProps) => {
  if (!render) return null
  return (
    <div className="flex h-full flex-col justify-center gap-2 overflow-hidden p-8">
      <div className="flex w-full items-baseline gap-4 overflow-hidden">
        <div className="shrink-0 whitespace-nowrap font-bold text-white capitalize">{title}</div>
        {/* show description next to title when address is set */}
        {description && address && (
          <Tooltip>
            <TooltipTrigger className="max-w-full truncate text-sm">{description}</TooltipTrigger>
            <TooltipContent>{description}</TooltipContent>
          </Tooltip>
        )}
        {!description && address && isLoading && (
          <div className="h-7 w-60 animate-pulse rounded-xs bg-grey-800" />
        )}
      </div>
      {address && (
        <div className="text-sm">
          <PortfolioAccount address={address} />
        </div>
      )}
      {/* show description below title when address is not set */}
      {isLoading && !description && !address && locked && (
        <div className="h-8 w-60 animate-pulse rounded-xs bg-grey-800" />
      )}
      {description && !address && (
        <Tooltip>
          <TooltipTrigger className="max-w-full truncate text-left text-sm">
            {description}
          </TooltipTrigger>
          <TooltipContent>{description}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
