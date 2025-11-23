import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { useBittensorValidator } from "@ui/state/bittensor"

export const BittensorValidatorName: FC<{
  hotkey: string | null | undefined
  prefix?: string
  noTooltip?: boolean
  className?: string
}> = ({ hotkey, prefix, noTooltip, className }) => {
  const { status, data: validator } = useBittensorValidator(hotkey)

  if (!hotkey) return null
  if (!validator && status === "loading") return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>
          {prefix ?? ""}
          {validator?.name ?? shortenAddress(hotkey, 8, 8)}
        </span>
      </TooltipTrigger>
      {!noTooltip && <TooltipContent>{hotkey}</TooltipContent>}
    </Tooltip>
  )
}
