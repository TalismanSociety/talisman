import { LoaderIcon } from "@talismn/icons"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { formatCompactNumber } from "@ui/domains/TaoDashboard/shared/util"
import type { IChartApi, ISeriesApi } from "lightweight-charts"
import type { FC } from "react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { createChartOptions } from "../chartOptions"
import { FlowChartToolbar } from "./FlowChartToolbar"
import type { FlowChartPoint } from "./types"
import { type UseFlowGraphDataReturn, useFlowGraphData } from "./useFlowChartData"

export const FlowChartGraph: FC<{
  netuid: number
  period: TimePeriod
  onPeriodChanged: (period: TimePeriod) => void
}> = ({ netuid, period, onPeriodChanged }) => {
  const { t } = useTranslation()
  const flowData = useFlowGraphData(netuid, period)

  // skeleton at this level so we dont display toolbar while loading
  if (flowData.isLoading) return <FlowChartGraphSkeleton />

  if (flowData.netData.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-body-secondary">
        {t("Failed to fetch data")}
      </div>
    )
  }

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      <FlowChartToolbar period={period} onPeriodChanged={onPeriodChanged} className="my-5 px-12" />
      <div className="grow">
        <FlowChartGraphContent flowData={flowData} />
      </div>
    </div>
  )
}

const FlowChartGraphContent: FC<{
  flowData: UseFlowGraphDataReturn
}> = ({ flowData }) => {
  const { t } = useTranslation()
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<{
    taoIn: ISeriesApi<"Area"> | null
    taoOut: ISeriesApi<"Area"> | null
    net: ISeriesApi<"Line"> | null
  }>({ taoIn: null, taoOut: null, net: null })
  const [chartReady, setChartReady] = useState(false)

  const { taoInData, taoOutData, netData, isLoading } = flowData

  // Effect 1: Load library & create chart instance (only depends on container ref)
  useEffect(() => {
    if (!chartContainerRef.current) return

    let cancelled = false
    let resizeObserver: ResizeObserver | undefined

    ;(async () => {
      const { createChart, AreaSeries, LineSeries } = await import("lightweight-charts")
      if (cancelled || !chartContainerRef.current) return

      const chart = createChart(
        chartContainerRef.current,
        createChartOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
          backgroundColor: "transparent",
          textColor: "#71717a",
          gridLineColor: "#27272a",
          crosshairColor: "#525252",
          rightPriceScaleMargins: { top: 0.1, bottom: 0.1 },
          handleScroll: false,
          handleScale: false,
        })
      )

      const priceFormatter = (price: number) => `${formatCompactNumber(price)}τ`

      // TAO In area (green)
      seriesRef.current.taoIn = chart.addSeries(AreaSeries, {
        lineColor: "#22c55e",
        topColor: "rgba(34, 197, 94, 0.4)",
        bottomColor: "rgba(34, 197, 94, 0.0)",
        lineWidth: 2,
        priceFormat: { type: "custom", formatter: priceFormatter },
      })

      // TAO Out area (red)
      seriesRef.current.taoOut = chart.addSeries(AreaSeries, {
        lineColor: "#ef4444",
        topColor: "rgba(239, 68, 68, 0.3)",
        bottomColor: "rgba(239, 68, 68, 0.0)",
        lineWidth: 2,
        priceFormat: { type: "custom", formatter: priceFormatter },
      })

      // Net flow line (blue dashed)
      seriesRef.current.net = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
        lineStyle: 2,
        priceFormat: { type: "custom", formatter: priceFormatter },
      })

      chartRef.current = chart

      // Resize observer
      const container = chartContainerRef.current
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          chart.applyOptions({ width, height })
        }
      })
      resizeObserver.observe(container)

      setChartReady(true)
    })()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      chartRef.current?.remove()
      chartRef.current = null
      seriesRef.current = { taoIn: null, taoOut: null, net: null }
      setChartReady(false)
    }
  }, []) // chart creation — only once per mount

  // Effect 2: Update data on existing series (no chart teardown)
  useEffect(() => {
    if (!chartReady) return
    const { taoIn, taoOut, net } = seriesRef.current
    const chart = chartRef.current
    if (!chart || !taoIn || !taoOut || !net) return

    taoIn.setData(taoInData as FlowChartPoint[])
    taoOut.setData(taoOutData as FlowChartPoint[])
    net.setData(netData as FlowChartPoint[])

    chart.timeScale().fitContent()
  }, [chartReady, taoInData, taoOutData, netData])

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
  <div className="flex size-full items-center justify-center">
    <LoaderIcon className="animate-spin-slow text-[40px]" />
  </div>
)
