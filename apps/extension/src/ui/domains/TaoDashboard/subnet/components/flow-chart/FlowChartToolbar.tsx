import { cn } from "@talismn/util"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { TIME_RANGES } from "./types"

interface FlowChartToolbarProps {
  days: number
  onDaysChanged: (range: number) => void
  className?: string
}

export const FlowChartToolbar: FC<FlowChartToolbarProps> = ({ days, onDaysChanged, className }) => {
  const { t } = useTranslation()

  return (
    <div className={cn("flex items-center justify-between px-6 pb-2", className)}>
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-green-500" />
          <span className="text-body-secondary">{t("Tao in")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-red-500" />
          <span className="text-body-secondary">{t("Tao out")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-blue-500 border-t-2 border-dashed" />
          <span className="text-body-secondary">{t("Net")}</span>
        </span>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Time range buttons */}
        <div className="flex items-center gap-1">
          {TIME_RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onDaysChanged(option.value)}
              className={cn(
                "rounded-xs px-2.5 py-1 font-medium text-xs transition-colors",
                days === option.value
                  ? "bg-grey-700 text-white"
                  : "text-body-secondary hover:bg-grey-800 hover:text-body"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
