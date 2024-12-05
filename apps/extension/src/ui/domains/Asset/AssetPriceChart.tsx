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
            enabled: false,
          },
          filler: {
            propagate: true,
          },
        },
      },

      data: {
        labels: data.prices.map(([timestamp]) => timestamp),
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
  }, [data.prices, refChart])

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
