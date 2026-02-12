import { AreaSeries, createChart, LineSeries, type UTCTimestamp } from "lightweight-charts"
import type { FC } from "react"
import { useEffect, useRef } from "react"

import { formatCompactNumber } from "./formatters"
import type { ProcessedFlowData } from "./types"

interface FlowChartGraphProps {
  flowData: ProcessedFlowData[]
}

export const FlowChartGraph: FC<FlowChartGraphProps> = ({ flowData }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartContainerRef.current || flowData.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 350,
      layout: {
        background: { color: "#0d0d0d" },
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

    // Map to chart data
    const taoInData = flowData.map((d) => ({
      time: Math.floor(d.time.getTime() / 1000) as UTCTimestamp,
      value: d.cumulativeTaoIn,
    }))

    const taoOutData = flowData.map((d) => ({
      time: Math.floor(d.time.getTime() / 1000) as UTCTimestamp,
      value: d.cumulativeTaoOut,
    }))

    const netData = flowData.map((d) => ({
      time: Math.floor(d.time.getTime() / 1000) as UTCTimestamp,
      value: d.net,
    }))

    taoInSeries.setData(taoInData)
    taoOutSeries.setData(taoOutData)
    netSeries.setData(netData)

    chart.timeScale().fitContent()

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [flowData])

  return (
    <div className="relative">
      <div ref={chartContainerRef} />
    </div>
  )
}
