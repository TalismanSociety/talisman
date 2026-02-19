import { AreaSeries, createChart, LineSeries, type Time } from "lightweight-charts"
import type { FC } from "react"
import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { FlowChartToolbar } from "./FlowChartToolbar"
import { formatCompactNumber } from "./formatters"
import { useFlowGraphData } from "./useFlowChartData"

const chartTimeToDate = (time: Time): Date => {
  if (typeof time === "number") return new Date(time * 1000)
  if (typeof time === "string") return new Date(time)
  return new Date(time.year, time.month - 1, time.day)
}

const formatLocalChartTime = (time: Time): string => {
  const date = chartTimeToDate(time)
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const FlowChartGraph: FC<{
  netuid: number
  days: number
  onDaysChanged: (days: number) => void
}> = ({ netuid, days, onDaysChanged }) => {
  const { t } = useTranslation()
  const { isLoading, netData } = useFlowGraphData(netuid, days)

  // skeleton at this level so we dont display toolbar while loading
  if (isLoading) return <FlowChartGraphSkeleton />

  if (netData.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-body-secondary">
        {t("Failed to fetch data")}
      </div>
    )
  }

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      <FlowChartToolbar days={days} onDaysChanged={onDaysChanged} className="my-5 px-12" />
      <div className="grow">
        <FlowChartGraphContent netuid={netuid} days={days} />
      </div>
    </div>
  )
}

const FlowChartGraphContent: FC<{
  netuid: number
  days: number
}> = ({ netuid, days }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const { taoInData, taoOutData, netData, isLoading } = useFlowGraphData(netuid, days)

  useEffect(() => {
    if (!chartContainerRef.current || taoInData.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "transparent" },
        textColor: "#71717a",
      },
      grid: {
        vertLines: { color: "#27272a", style: 3 },
        horzLines: { color: "#27272a", style: 3 },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "#525252", width: 1, style: 3, labelBackgroundColor: "#27272a" },
        horzLine: { color: "#525252", width: 1, style: 3, labelBackgroundColor: "#27272a" },
      },
      localization: {
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        timeFormatter: formatLocalChartTime,
      },
      handleScroll: false,
      handleScale: false,
    })

    // TAO In area (green)
    const taoInSeries = chart.addSeries(AreaSeries, {
      lineColor: "#22c55e",
      topColor: "rgba(34, 197, 94, 0.4)",
      bottomColor: "rgba(34, 197, 94, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${formatCompactNumber(price)}τ`,
      },
    })

    // TAO Out area (red)
    const taoOutSeries = chart.addSeries(AreaSeries, {
      lineColor: "#ef4444",
      topColor: "rgba(239, 68, 68, 0.3)",
      bottomColor: "rgba(239, 68, 68, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${formatCompactNumber(price)}τ`,
      },
    })

    // Net flow line (blue dashed)
    const netSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      lineStyle: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${formatCompactNumber(price)}τ`,
      },
    })

    // Data is already in { time, value } format from the hook
    taoInSeries.setData(taoInData)
    taoOutSeries.setData(taoOutData)
    netSeries.setData(netData)

    chart.timeScale().fitContent()

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [taoInData, taoOutData, netData])

  if (isLoading) return <FlowChartGraphSkeleton />

  if (taoInData.length === 0) {
    return (
      <div className="flex size-full items-center justify-center text-body-secondary">
        {t("No flow data available for this subnet.")}
      </div>
    )
  }

  return <div ref={chartContainerRef} className="size-full" />
}

const FlowChartGraphSkeleton = () => (
  <div className="relative size-full">
    {/* Grid lines */}
    <div className="absolute inset-x-4 top-[20%] h-px bg-grey-800/50" />
    <div className="absolute inset-x-4 top-[40%] h-px bg-grey-800/50" />
    <div className="absolute inset-x-4 top-[60%] h-px bg-grey-800/50" />
    <div className="absolute inset-x-4 top-[80%] h-px bg-grey-800/50" />

    {/* Centered area chart icon */}
    <div className="absolute inset-0 flex animate-pulse items-center justify-center">
      <svg className="h-24 w-32" viewBox="0 0 80 48" fill="none">
        {/* Green area (TAO In) */}
        <path
          d="M0 36 L13 28 L26 30 L40 20 L53 22 L66 14 L80 16 L80 48 L0 48 Z"
          fill="currentColor"
          className="text-buy/20"
        />
        <path
          d="M0 36 L13 28 L26 30 L40 20 L53 22 L66 14 L80 16"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-buy/50"
          fill="none"
        />
        {/* Red area (TAO Out) */}
        <path
          d="M0 42 L13 40 L26 41 L40 36 L53 38 L66 34 L80 35 L80 48 L0 48 Z"
          fill="currentColor"
          className="text-sell/15"
        />
        <path
          d="M0 42 L13 40 L26 41 L40 36 L53 38 L66 34 L80 35"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-sell/40"
          fill="none"
        />
      </svg>
    </div>
  </div>
)
