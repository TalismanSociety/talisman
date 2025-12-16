import { cn } from "@talismn/util"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { useYieldxyzProvider } from "@ui/state/yield"

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
            <div className="text-body text-base">{provider.name}</div>
            {!!provider.description && <p>{provider.description}</p>}
            {typeof provider.tvlUsd === "number" && <div>TVL: {provider.tvlUsd}</div>}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  )
}
