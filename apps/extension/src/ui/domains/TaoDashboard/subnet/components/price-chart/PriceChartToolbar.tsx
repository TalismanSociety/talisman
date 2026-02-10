import { cn } from "@talismn/util"
import type { FC } from "react"

import { type IndicatorConfig, TIME_RANGES } from "./types"

interface PriceChartToolbarProps {
  timeRange: number
  setTimeRange: (range: number) => void
  indicators: IndicatorConfig
  toggleIndicator: (key: keyof IndicatorConfig) => void
}

export const PriceChartToolbar: FC<PriceChartToolbarProps> = ({
  timeRange,
  setTimeRange,
  indicators,
  toggleIndicator,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-2">
      {/* Left side - Indicator toggles */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-body-disabled text-xs">Indicators:</span>
        <IndicatorButton
          active={indicators.sma7}
          color="#f59e0b"
          label="SMA 7"
          onClick={() => toggleIndicator("sma7")}
        />
        <IndicatorButton
          active={indicators.sma25}
          color="#8b5cf6"
          label="SMA 25"
          onClick={() => toggleIndicator("sma25")}
        />
        <IndicatorButton
          active={indicators.ema12}
          color="#3b82f6"
          label="EMA 12"
          onClick={() => toggleIndicator("ema12")}
        />
        <IndicatorButton
          active={indicators.ema26}
          color="#ec4899"
          label="EMA 26"
          onClick={() => toggleIndicator("ema26")}
        />
        <IndicatorButton
          active={indicators.bollingerBands}
          color="#6b7280"
          activeTextColor="#9ca3af"
          label="BB"
          onClick={() => toggleIndicator("bollingerBands")}
        />
        <IndicatorButton
          active={indicators.rsi}
          color="#a855f7"
          label="RSI"
          onClick={() => toggleIndicator("rsi")}
        />
      </div>

      {/* Right side - Live indicator and time range */}
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
              onClick={() => setTimeRange(option.value)}
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
}

interface IndicatorButtonProps {
  active: boolean
  color: string
  activeTextColor?: string
  label: string
  onClick: () => void
}

const IndicatorButton: FC<IndicatorButtonProps> = ({
  active,
  color,
  activeTextColor,
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center gap-1 rounded px-2 py-0.5 font-medium text-xs transition-colors",
      active
        ? `bg-[${color}]/20 text-[${activeTextColor ?? color}]`
        : "text-body-disabled hover:bg-grey-800 hover:text-body-secondary"
    )}
    style={active ? { backgroundColor: `${color}20`, color: activeTextColor ?? color } : undefined}
  >
    <span className="size-2 rounded-full" style={{ backgroundColor: active ? color : undefined }} />
    {label}
  </button>
)
