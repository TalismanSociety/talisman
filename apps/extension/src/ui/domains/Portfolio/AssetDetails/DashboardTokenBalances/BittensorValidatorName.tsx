import { shortenAddress } from "@talisman/util/shortenAddress"
import { cn } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useBittensorValidator } from "@ui/state/bittensor"
import type { FC } from "react"

export const BittensorValidatorName: FC<{
  hotkey: string | null | undefined
  prefix?: string
  noTooltip?: boolean
  className?: string
}> = ({ hotkey, prefix, noTooltip, className }) => {
  const { status, data: validator } = useBittensorValidator(hotkey)

  if (!hotkey) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(status === "loading" && "animate-pulse", className)}>
          {prefix ?? ""}
          {validator?.name ?? shortenAddress(hotkey, 8, 8)}
        </span>
      </TooltipTrigger>
      {!noTooltip && <TooltipContent>{hotkey}</TooltipContent>}
    </Tooltip>
  )
}
