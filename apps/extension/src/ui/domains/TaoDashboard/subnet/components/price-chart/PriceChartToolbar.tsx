import { cn } from "@talismn/util"
import type { FC } from "react"

import { INDICATOR_CONFIG, type IndicatorKey } from "./chartConfig"
import { type IndicatorConfig, TIME_RANGES } from "./types"

interface PriceChartToolbarProps {
  timeRange: number
  setTimeRange: (range: number) => void
  indicators: IndicatorConfig
  toggleIndicator: (key: keyof IndicatorConfig) => void
  className?: string
}

/** Order of indicators in the toolbar */
const INDICATOR_ORDER: IndicatorKey[] = ["sma7", "sma25", "sma99", "bollingerBands", "rsi"]

export const PriceChartToolbar: FC<PriceChartToolbarProps> = ({
  timeRange,
  setTimeRange,
  indicators,
  toggleIndicator,
  className,
}) => {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      {/* Left side - Indicator toggles */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-body-disabled text-xs">Indicators:</span>
        {INDICATOR_ORDER.map((key) => {
          const config = INDICATOR_CONFIG[key]
          return (
            <IndicatorButton
              key={key}
              active={indicators[key]}
              color={config.color}
              activeTextColor={"activeTextColor" in config ? config.activeTextColor : undefined}
              label={config.label}
              onClick={() => toggleIndicator(key)}
            />
          )
        })}
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
      "flex items-center gap-1 rounded-xs px-2 py-1 font-medium text-xs transition-colors",
      active
        ? `bg-[${color}]/20 text-[${activeTextColor ?? color}]`
        : "text-body-disabled hover:bg-grey-800 hover:text-body-secondary"
    )}
    style={active ? { backgroundColor: `${color}20`, color: activeTextColor ?? color } : undefined}
  >
    {/* <span className="size-2 rounded-full" style={{ backgroundColor: active ? color : undefined }} /> */}
    {label}
  </button>
)
