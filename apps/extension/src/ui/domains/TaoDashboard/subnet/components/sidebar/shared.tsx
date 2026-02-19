import { InfoIcon } from "@talismn/icons"
import { TaoDashboardPeriodTabs } from "@ui/domains/TaoDashboard/shared/TaoDashboardPeriodTabs"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { getDaysPerPeriod } from "@ui/domains/TaoDashboard/shared/util"
import { type FC, type ReactNode, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

export const SectionTitleBar: FC<{
  label: ReactNode
  period: TimePeriod
  tooltip?: ReactNode
  onPeriodChange: (period: TimePeriod) => void
}> = ({ label, period, tooltip, onPeriodChange }) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="flex items-center gap-2 font-medium text-md text-white">
        <span>{label}</span>
        {!!tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <InfoIcon className="size-[0.9em]" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-lg">{tooltip}</div>
            </TooltipContent>
          </Tooltip>
        )}
      </h3>
      <TaoDashboardPeriodTabs selected={period} onSelect={onPeriodChange} />
    </div>
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

export const formatNumber = (num: number, decimals = 0): string => {
  if (num === 0) return "0"
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(decimals)
}

export const formatCompactNumber = (num: number): string => {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(0)
}

export const useDaysFromPeriod = (period: TimePeriod): number => {
  return useMemo(() => getDaysPerPeriod(period), [period])
}
