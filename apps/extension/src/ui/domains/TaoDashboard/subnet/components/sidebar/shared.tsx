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

// TODO check if used
export const formatNumber = (num: number, decimals = 0): string => {
  if (num === 0) return "0"
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(decimals)
}

// TODO check if used
export const formatCompactNumber = (num: number): string => {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(0)
}

// TODO check if used
export const formatTimeAgo = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export const useDaysFromPeriod = (period: TimePeriod): number => {
  return useMemo(() => getDaysPerPeriod(period), [period])
}
