import { cn } from "@talismn/util"
import type { FC } from "react"

import { TIME_RANGES } from "./types"

interface FlowChartToolbarProps {
  timeRange: number
  onTimeRangeChange: (range: number) => void
}

export const FlowChartToolbar: FC<FlowChartToolbarProps> = ({ timeRange, onTimeRangeChange }) => (
  <div className="flex items-center justify-between px-6 pb-2">
    {/* Legend */}
    <div className="flex items-center gap-4 text-xs">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 bg-green-500" />
        <span className="text-body-secondary">Tao in</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 bg-red-500" />
        <span className="text-body-secondary">Tao out</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 border-blue-500 border-t-2 border-dashed" />
        <span className="text-body-secondary">Net</span>
      </span>
    </div>

    {/* Right side controls */}
    <div className="flex items-center gap-3">
      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
        <span className="font-medium text-green-500 text-xs">Live</span>
      </div>

      {/* Time range buttons */}
      <div className="flex items-center gap-1">
        {TIME_RANGES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onTimeRangeChange(option.value)}
            className={cn(
              "rounded px-2.5 py-1 font-medium text-xs transition-colors",
              timeRange === option.value
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
