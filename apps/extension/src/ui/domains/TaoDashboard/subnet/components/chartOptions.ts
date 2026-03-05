import { formatLocalChartTime, formatLocalTickMark } from "@ui/domains/TaoDashboard/shared/util"
import type { DeepPartial, TimeChartOptions } from "lightweight-charts"

export type SharedChartOptionsParams = {
  width: number
  height: number
  backgroundColor: string
  textColor: string
  gridLineColor: string
  crosshairColor: string
  rightPriceScaleMargins: {
    top: number
    bottom: number
  }
  hideVerticalGridLines?: boolean
  handleScroll?: boolean
  handleScale?: TimeChartOptions["handleScale"]
}

export const createChartOptions = ({
  width,
  height,
  backgroundColor,
  textColor,
  gridLineColor,
  crosshairColor,
  rightPriceScaleMargins,
  hideVerticalGridLines = false,
  handleScroll,
  handleScale,
}: SharedChartOptionsParams): DeepPartial<TimeChartOptions> => ({
  width,
  height,
  layout: {
    background: { color: backgroundColor },
    textColor,
  },
  grid: {
    vertLines: { visible: !hideVerticalGridLines, color: gridLineColor, style: 3 as const },
    horzLines: { color: gridLineColor, style: 3 as const },
  },
  rightPriceScale: {
    borderVisible: false,
    scaleMargins: rightPriceScaleMargins,
  },
  timeScale: {
    borderVisible: false,
    timeVisible: true,
    secondsVisible: false,
    tickMarkFormatter: formatLocalTickMark,
  },
  crosshair: {
    mode: 1 as const,
    vertLine: {
      color: crosshairColor,
      width: 1 as const,
      style: 3 as const,
      labelBackgroundColor: gridLineColor,
    },
    horzLine: {
      color: crosshairColor,
      width: 1 as const,
      style: 3 as const,
      labelBackgroundColor: gridLineColor,
    },
  },
  localization: {
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    timeFormatter: formatLocalChartTime,
  },
  ...(handleScroll !== undefined ? { handleScroll } : {}),
  ...(handleScale !== undefined ? { handleScale } : {}),
})
