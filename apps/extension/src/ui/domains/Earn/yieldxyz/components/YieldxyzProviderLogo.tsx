import { cn } from "@talismn/util"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { useYieldxyzProvider } from "@ui/state/yieldxyz"

export const YieldxyzProviderLogo: FC<{
  providerId: string | null | undefined
  className?: string
}> = ({ providerId, className }) => {
  const { data: provider } = useYieldxyzProvider(providerId)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-block size-16 shrink-0", className)}>
          <AssetLogo url={provider?.logoURI} className="size-full" />
        </div>
      </TooltipTrigger>
      {!!provider && (
        <TooltipContent>
          <div className="text-body-secondary flex max-w-[40rem] flex-col gap-2 p-2 text-sm">
            <div className="text-body">{provider.name}</div>
            {!!provider.description && <p>{provider.description}</p>}
            {typeof provider.tvlUsd === "number" && <div>TVL: {provider.tvlUsd}</div>}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  )
}

export const YieldxyzProviderDisplay: FC<{
  providerId: string | null | undefined
  className?: string
  logoClassName?: string
}> = ({ providerId, className }) => {
  const { data: provider } = useYieldxyzProvider(providerId)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex max-w-full items-center gap-[0.5em] overflow-hidden", className)}>
          <AssetLogo url={provider?.logoURI} className="size-[1.5em] shrink-0" />
          <div className="truncate">{provider?.name}</div>
        </div>
      </TooltipTrigger>
      {!!provider && (
        <TooltipContent>
          <div className="text-body-secondary flex max-w-[40rem] flex-col gap-2 p-2 text-sm">
            <div className="text-body">{provider.name}</div>
            {!!provider.description && <p>{provider.description}</p>}
            {typeof provider.tvlUsd === "number" && <div>TVL: {provider.tvlUsd}</div>}
            {!!provider.website && <div className="text-body-secondary">{provider.website}</div>}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  )
}
