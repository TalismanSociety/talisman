import { InfoIcon } from "@talismn/icons"
import { TaoDashboardPeriodTabs } from "@ui/domains/TaoDashboard/shared/TaoDashboardPeriodTabs"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui"
import type { FC, ReactNode } from "react"

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
