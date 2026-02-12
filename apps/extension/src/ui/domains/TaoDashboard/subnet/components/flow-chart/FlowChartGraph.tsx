import { AreaSeries, createChart, LineSeries } from "lightweight-charts"
import type { FC } from "react"
import { useEffect, useRef } from "react"

import { formatCompactNumber } from "./formatters"
import { useFlowGraphData } from "./useFlowChartData"

interface FlowChartGraphProps {
  netuid: number
  timeRange: number
}

export const FlowChartGraph: FC<FlowChartGraphProps> = ({ netuid, timeRange }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const { taoInData, taoOutData, netData, isLoading } = useFlowGraphData(netuid, timeRange)

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
        No flow data available for this subnet.
      </div>
    )
  }

  return <div ref={chartContainerRef} className="size-full" />
}

const FlowChartGraphSkeleton = () => (
  <div className="flex size-full items-center justify-center">
    <div className="h-10 w-40 animate-pulse rounded-lg bg-grey-700" />
  </div>
)
