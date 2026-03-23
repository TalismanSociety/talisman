import { cn } from "@talismn/util"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { INDICATOR_CONFIG, type IndicatorKey } from "./chartConfig"
import type { IndicatorConfig, OhlcvResolution } from "./types"

interface PriceChartToolbarProps {
  resolution: OhlcvResolution
  setResolution: (range: OhlcvResolution) => void
  indicators: IndicatorConfig
  toggleIndicator: (key: keyof IndicatorConfig) => void
  className?: string
}

/** Order of indicators in the toolbar */
const INDICATOR_ORDER: IndicatorKey[] = ["sma7", "sma25", "sma99", "bollingerBands", "rsi"]

type ResolutionOption = {
  label: string
  value: OhlcvResolution
}

export const PriceChartToolbar: FC<PriceChartToolbarProps> = ({
  resolution: timeRange,
  setResolution: setTimeRange,
  indicators,
  toggleIndicator,
  className,
}) => {
  const { t } = useTranslation()

  const timeRanges = useMemo<ResolutionOption[]>(() => {
    return [
      { label: t("5m"), value: "5" },
      { label: t("15m"), value: "15" },
      { label: t("1h"), value: "60" },
      { label: t("4h"), value: "240" },
      { label: t("1D"), value: "1440" },
    ]
  }, [t])

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      {/* Left side - Indicator toggles */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-body-disabled text-xs">{t("Indicators:")}</span>
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
        {/* Time range buttons */}
        <div className="flex items-center gap-1">
          {timeRanges.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTimeRange(option.value)}
              className={cn(
                "rounded-xs px-2.5 py-1 font-medium text-xs transition-colors",
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
      !active && "text-body-disabled hover:bg-grey-800 hover:text-body-secondary"
    )}
    style={active ? { backgroundColor: `${color}20`, color: activeTextColor ?? color } : undefined}
  >
    {label}
  </button>
)
