import { Address } from "extension-core"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

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
    <div className="flex flex-col justify-center gap-2 overflow-hidden p-8">
      <div className="flex w-full items-baseline gap-4 overflow-hidden">
        <div className="shrink-0 whitespace-nowrap font-bold capitalize text-white">{title}</div>
        {/* show description next to title when address is set */}
        {description && address && (
          <Tooltip>
            <TooltipTrigger className="max-w-full truncate text-sm">{description}</TooltipTrigger>
            <TooltipContent>{description}</TooltipContent>
          </Tooltip>
        )}
        {!description && address && isLoading && (
          <div className="bg-grey-800 rounded-xs h-[1.4rem] w-60 animate-pulse" />
        )}
      </div>
      {address && (
        <div className="text-sm">
          <PortfolioAccount address={address} />
        </div>
      )}
      {/* show description below title when address is not set */}
      {isLoading && !description && !address && locked && (
        <div className="bg-grey-800 rounded-xs h-[1.6rem] w-60 animate-pulse" />
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
