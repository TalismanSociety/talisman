import { TokenId } from "@talismn/chaindata-provider"
import { TokenRateCurrency } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import ChartJs from "chart.js/auto"
import { fetchFromCoingecko } from "extension-core"
import { log } from "extension-shared"
import { FC, useEffect, useMemo, useRef, useState } from "react"

import { useSelectedCurrency, useTokenRatesMap, useTokensMap } from "@ui/state"

type ChartSpanConfig = {
  label: string
  days: string // number as string, also supports "max"
  interval?: "5m" | "hourly" | "daily" // leave empty for auto granularity
}

const CHART_SPANS: Record<string, ChartSpanConfig> = {
  H: {
    label: "H",
    days: "1",
  },
  D: {
    label: "D",
    days: "1",
    interval: "hourly",
  },
  W: {
    label: "W",
    days: "7",
  },
  M: {
    label: "M",
    days: "30",
  },
}

type ChartSpan = keyof typeof CHART_SPANS

const useMarketChart = (
  coingeckoId: string | null,
  currency: TokenRateCurrency,
  span: ChartSpan,
) => {
  return useQuery({
    queryKey: ["priceChart", coingeckoId, currency, span],
    queryFn: async () => {
      if (!coingeckoId) return null

      const query = new URLSearchParams({
        vs_currency: currency,
        days: CHART_SPANS[span].days,
      })
      const result = await fetchFromCoingecko(
        `/api/v3/coins/${coingeckoId}/market_chart?${query.toString()}`,
      )
      if (!result.ok) throw new Error("Failed to fetch market chart for " + coingeckoId)

      return result.json() as Promise<{ prices: [number, number][] }>
    },

    // TODO find a way to sync it with tokenRates store
  })
}

const Chart: FC<{ data: { prices: [number, number][] } }> = ({ data }) => {
  const refChart = useRef<HTMLCanvasElement>(null)
  const currency = useSelectedCurrency()

  useEffect(() => {
    if (!refChart.current) return
    const chart = new ChartJs(refChart.current, {
      type: "line",
      options: {
        animation: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            mode: "nearest",
            intersect: false,
            callbacks: {
              title: function (tooltipItems) {
                // Shorten the date format
                const rawDate = tooltipItems[0].label // Original date
                const date = new Date(rawDate)
                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) // "Dec 1"
              },
              label: function (tooltipItem) {
                const value = tooltipItem.raw as number
                return new Intl.NumberFormat(undefined, {
                  maximumSignificantDigits: 4,
                  style: "currency",
                  currency,
                  currencyDisplay: currency === "usd" ? "narrowSymbol" : "symbol",
                  notation: value >= 10_000 ? "compact" : "standard", // account for very low currencies such as korean won
                }).format(value)
              },
            },
            // external: function (context) {
            //   const tooltip = context.tooltip
            //   const chart = context.chart
            //   const ctx = chart.ctx

            //   if (!tooltip || tooltip.opacity === 0) return

            //   const x = tooltip.caretX // Tooltip's x position
            //   const yStart = chart.chartArea.top // Top of the chart area
            //   const yEnd = chart.chartArea.bottom // Bottom of the chart area

            //   ctx.save()
            //   ctx.beginPath()
            //   ctx.setLineDash([5, 5]) // Define the dash pattern: [dash length, gap length]
            //   ctx.strokeStyle = "rgba(255, 255, 255, 0.5)" // Dashed line color
            //   ctx.lineWidth = 1 // Line width
            //   ctx.moveTo(x, yStart) // Start at the tooltip x position
            //   ctx.lineTo(x, yEnd) // Draw to the bottom
            //   ctx.stroke()
            //   ctx.restore()
            // },
          },
          filler: {
            propagate: true,
          },
        },
        scales: {
          x: {
            ticks: {
              display: false, // This hides the labels on the X-axis
            },
            // grid: {
            //   drawTicks: false, // Optional: Hide the grid line ticks on the X-axis
            // },
          },
        },
        // scales: {
        //   xAxis: {
        //     type: "time",
        //   },
        // },
      },

      data: {
        labels: data.prices.map(([timestamp]) => new Date(timestamp)),
        // xLabels: data.prices.map(([timestamp]) => timestamp),
        datasets: [
          {
            label: "Price",
            data: data.prices.map(([, price]) => price),
          },
        ],
      },
    })

    return () => {
      chart.destroy()
    }
  }, [currency, data.prices, refChart])

  return <canvas ref={refChart} className="h-[17.6rem] w-full"></canvas>
}

export const AssetPriceChart: FC<{ tokenIds: TokenId[]; className?: string }> = ({ tokenIds }) => {
  const currency = useSelectedCurrency()
  const tokensMap = useTokensMap()
  const tokens = useMemo(
    () => tokenIds.map((id) => tokensMap[id]).filter((t) => !!t?.coingeckoId),
    [tokenIds, tokensMap],
  )

  const tokenRates = useTokenRatesMap()
  const [coingeckoId, _setCoingeckoId] = useState<string | null>(tokens[0]?.coingeckoId ?? null)

  const { data, refetch } = useMarketChart(coingeckoId, currency, "D")

  useEffect(() => {
    log.debug("AssetPriceGraph refetch")
    // update graph if tokenRates data changes
    refetch()
  }, [tokenRates, refetch])

  useEffect(() => {
    log.debug("AssetPriceGraph data", { data })
  }, [data])

  return <div className={classNames("")}>{!!data && <Chart data={data} />}</div>
}
