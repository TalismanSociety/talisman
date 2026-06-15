import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { useBittensorValidator } from "@ui/state/bittensor"
import { cn } from "@ui/util/cn"
import { shortenAddress } from "@ui/util/shortenAddress"
import type { FC } from "react"

/**
 * Compact hotkey tag shown next to a dtao conviction lock's title in the portfolio:
 * the hotkey's account icon + its name (or shortened hotkey when it has no name).
 */
export const ConvictionLockHotkeyTag: FC<{
  hotkey: string | null | undefined
  className?: string
}> = ({ hotkey, className }) => {
  const { status, data: identity } = useBittensorValidator(hotkey)

  if (!hotkey) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "flex min-w-0 items-center gap-2 font-normal text-body-secondary text-sm",
            className
          )}
        >
          <AccountIcon address={hotkey} className="shrink-0 text-[1.2em]" />
          <span className={cn("truncate", status === "loading" && "animate-pulse")}>
            {identity?.name ?? shortenAddress(hotkey, 6, 6)}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{hotkey}</TooltipContent>
    </Tooltip>
  )
}
