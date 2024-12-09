import { Token, TokenId } from "@talismn/chaindata-provider"
import { TokenRateCurrency } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import ChartJs, { ChartComponentLike } from "chart.js/auto"
import { fetchFromCoingecko } from "extension-core"
import { log } from "extension-shared"
import { uniq } from "lodash"
import {
  ButtonHTMLAttributes,
  FC,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Popover, PopoverContent, PopoverTrigger, usePopoverContext } from "talisman-ui"

import { useSelectedCurrency, useTokenRatesMap, useTokensMap } from "@ui/state"

import { AssetPrice } from "./AssetPrice"
import { TokenLogo } from "./TokenLogo"

export const AssetPriceChart: FC<{ tokenIds: TokenId[]; className?: string }> = ({ tokenIds }) => {
  const currency = useSelectedCurrency()
  const tokensMap = useTokensMap()
  const tokensWithCoingeckoId = useMemo(
    () => tokenIds.map((id) => tokensMap[id]).filter((t) => !!t?.coingeckoId),
    [tokenIds, tokensMap],
  )

  const selectedCurrency = useSelectedCurrency()
  const tokenRates = useTokenRatesMap()

  // we want user to select a coingecko token, but we dont have this kind of object, so select a token and make sure each one is mapped to a unique coingeckoId
  const selectableTokens = useMemo(() => {
    if (!tokenRates) return []

    const coingeckoIds = uniq((tokensWithCoingeckoId || []).map((t) => t.coingeckoId)).filter(
      Boolean,
    )
    // console.log("uniq coingecko ids", coingeckoIds)
    const tokens = coingeckoIds
      .map((coingeckoId) => tokensWithCoingeckoId.find((t) => t.coingeckoId === coingeckoId))
      .filter(Boolean) as Token[]

    return tokens.sort((a, b) => {
      // sort by descending market cap
      const mc1 = tokenRates[a.id]?.[selectedCurrency]?.marketCap ?? 0
      const mc2 = tokenRates[b.id]?.[selectedCurrency]?.marketCap ?? 0
      return mc2 - mc1
    })
  }, [selectedCurrency, tokenRates, tokensWithCoingeckoId])

  const [selectedTokenId, setSelectedTokenId] = useState<TokenId | null>(
    selectableTokens[0]?.id ?? null,
  )
  const coingeckoId = useMemo(
    () => tokensWithCoingeckoId.find((t) => t.id === selectedTokenId)?.coingeckoId ?? null,
    [selectedTokenId, tokensWithCoingeckoId],
  )

  const [timespan, setTimespan] = useState<ChartSpan>("D")

  const { data: prices, refetch } = useMarketChart(coingeckoId, currency, timespan)

  useEffect(() => {
    // update graph if tokenRates data changes
    log.debug("AssetPriceGraph refetch")
    refetch()
  }, [tokenRates, refetch])

  if (!selectedTokenId || !selectableTokens.length) return null

  // console.log("AssetPriceChart", {
  //   selectedTokenId,
  //   selectableTokens,
  //   tokenIds,
  //   tokensWithCoingeckoId,
  // })

  return (
    <div
      className={classNames(
        "bg-black-secondary flex h-[16.8rem] w-full shrink-0 flex-col overflow-hidden rounded-sm",
      )}
    >
      <div className="flex shrink-0 justify-between p-5">
        <TokenSelect
          value={selectedTokenId}
          tokens={selectableTokens}
          onChange={setSelectedTokenId}
        />
        <AssetPrice tokenId={selectedTokenId} noChange />
      </div>
      <div className="grow overflow-hidden">
        {!!prices && <Chart prices={prices} timespan={timespan} />}
      </div>
      <TimespanSelect
        value={timespan}
        onChange={setTimespan}
        className={classNames(prices && "bg-primary/10")}
      />
    </div>
  )
}

type ChartSpanConfig = {
  label: string
  days: string // number as string, also supports "max"
  time: boolean
}

const CHART_TIMESPANS: Record<string, ChartSpanConfig> = {
  H: {
    label: "1H",
    days: "1",
    time: true,
  },
  D: {
    label: "1D",
    days: "2",
    time: true,
  },
  W: {
    label: "1W",
    days: "7",
    time: true,
  },
  M: {
    label: "1M",
    days: "30",
    time: false,
  },
  Y: {
    label: "1Y",
    days: "365",
    time: false,
  },
  A: {
    label: "ALL",
    days: "max",
    time: false,
  },
}

type ChartSpan = keyof typeof CHART_TIMESPANS

const useMarketChart = (
  coingeckoId: string | null,
  currency: TokenRateCurrency,
  timespan: ChartSpan,
) => {
  return useQuery({
    queryKey: ["priceChart", coingeckoId, currency, timespan],
    queryFn: async () => {
      if (!coingeckoId) return null
      const config = CHART_TIMESPANS[timespan]

      const query = new URLSearchParams({
        vs_currency: currency,
        days: config.days,
      })

      const result = await fetchFromCoingecko(
        `/api/v3/coins/${coingeckoId}/market_chart?${query.toString()}`,
      )
      if (!result.ok) throw new Error("Failed to fetch market chart for " + coingeckoId)

      return result.json() as Promise<{ prices: [number, number][] }>
    },
    select: (data) => {
      switch (timespan) {
        case "H":
          return data?.prices.slice(-13) // interval is 5m, keep last 12 entries + current price
        case "D":
          return data?.prices.slice(-25) // interval is 1h, keep list 24 entries + current price
        default:
          return data?.prices // interval is 1d
      }
    },

    // TODO find a way to sync it with tokenRates store
  })
}

const verticalLinePlugin: ChartComponentLike = {
  id: "verticalLine",
  afterDatasetsDraw(chart) {
    const { ctx, tooltip, chartArea } = chart

    if (tooltip && tooltip.opacity !== 0) {
      const tooltipX = tooltip.caretX

      ctx.save()
      ctx.beginPath()
      ctx.setLineDash([5, 5]) // Dashed line
      ctx.strokeStyle = "rgba(213, 255, 92, 0.5)" // Line color
      ctx.lineWidth = 1 // Line width
      ctx.moveTo(tooltipX, chartArea.top) // Start at the top of the chart
      ctx.lineTo(tooltipX, chartArea.bottom) // Extend to the bottom
      ctx.stroke()
      ctx.restore()
    }
  },
}

ChartJs.register(verticalLinePlugin)

const Chart: FC<{ prices: [number, number][]; timespan: ChartSpan }> = ({ prices, timespan }) => {
  const refChart = useRef<HTMLCanvasElement>(null)
  const currency = useSelectedCurrency()

  useEffect(() => {
    if (!refChart.current) return

    // set min/max boundaries for y axis to ensure we have 10% gap on each side, so our timespan selector and token dropdown arent drawn on the price line
    // const minPrice = Math.min(...prices.map(([, price]) => price))
    // const maxPrice = Math.max(...prices.map(([, price]) => price))
    // const suggestedMin = minPrice - (maxPrice - minPrice) * 0.15
    // const suggestedMax = maxPrice + (maxPrice - minPrice) * 0.15

    const chart = new ChartJs(refChart.current, {
      type: "line",
      options: {
        //aspectRatio: 366 / 168,
        maintainAspectRatio: false,
        responsive: true,
        animation: false,
        layout: {
          padding: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
        },
        // interaction: {
        //   mode: "index", // Ensures interaction on the nearest data point
        //   intersect: false, // Allows hovering anywhere on the X-axis to show the line
        // },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            mode: "index",
            intersect: false,
            displayColors: false,
            backgroundColor: "#262626",
            titleColor: "#d5ff5c",
            bodyColor: "#d5ff5c",
            titleMarginBottom: 0,
            caretPadding: 40,
            yAlign: "bottom",
            callbacks: {
              title: function (tooltipItems) {
                const date = new Date(tooltipItems[0].label)
                return CHART_TIMESPANS[timespan].time
                  ? `${date.toLocaleDateString(undefined, { dateStyle: "short" })} ${date.toLocaleTimeString(undefined, { timeStyle: "short" })}`
                  : date.toLocaleDateString(undefined, { dateStyle: "short" })
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
          },
          // Custom plugin for the vertical line
          // customLine: {
          //   id: "verticalLine",
          //   afterDatasetsDraw(chart, args, options) {
          //     const { ctx, tooltip, chartArea } = chart

          //     // Draw vertical line only if tooltip is visible
          //     if (tooltip && tooltip.opacity !== 0) {
          //       const tooltipX = tooltip.caretX

          //       ctx.save()
          //       ctx.beginPath()
          //       ctx.setLineDash([5, 5]) // Dashed line
          //       ctx.strokeStyle = "rgba(213, 255, 92, 0.5)" // Line color
          //       ctx.lineWidth = 1 // Line width
          //       ctx.moveTo(tooltipX, chartArea.top) // Start at the top of the chart
          //       ctx.lineTo(tooltipX, chartArea.bottom) // Extend to the bottom
          //       ctx.stroke()
          //       ctx.restore()
          //     }
          //   },
          // },
        },
        scales: {
          x: {
            ticks: {
              display: false,
              align: "start",
            },
            grid: {
              display: false,
              // drawBorder: false, // Removes border line around the chart
              drawTicks: false, // Removes tick marks on the grid
            },
          },
          y: {
            ticks: {
              display: false,
              align: "start",
            },
            grid: {
              display: false,
              drawTicks: false,
            },
          },
        },
      },

      data: {
        labels: prices.map(([timestamp]) => new Date(timestamp)),
        // xLabels: data.prices.map(([timestamp]) => timestamp),
        datasets: [
          {
            label: "Price",
            data: prices.map(([, price]) => price),
            borderColor: "#d5ff5c",
            pointRadius: 0,
            tension: 0.1,
            fill: true,
            // linear gradient from #d5ff5c to transparent

            backgroundColor: "rgba(213, 255, 92, 0.1)",
            borderWidth: 2,
          },
        ],
      },
    })

    return () => {
      chart.destroy()
    }
  }, [currency, prices, refChart, timespan])

  return <canvas ref={refChart}></canvas>
}

const TimespanSelect: FC<{
  value: ChartSpan
  onChange: (value: ChartSpan) => void
  className?: string
}> = ({ value, onChange, className }) => {
  return (
    <div
      className={classNames(
        "text-body-secondary flex h-16 w-full shrink-0 items-center justify-center gap-2 text-[1rem] font-bold",
        className,
      )}
    >
      {Object.entries(CHART_TIMESPANS).map(([key, { label }]) => (
        <button
          key={key}
          type="button"
          className={classNames(
            "rounded-[0.6rem] px-3 py-1.5 hover:bg-white/5 hover:text-white",
            value === key && "bg-white/10 text-white",
          )}
          onClick={() => onChange(key as ChartSpan)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

const TokenSelect: FC<{
  tokens: Token[]
  value: TokenId
  onChange: (tokenId: TokenId) => void
}> = ({ tokens, value, onChange }) => {
  const token = useMemo(() => tokens.find((t) => t.id === value), [tokens, value])

  if (!token || !tokens.length) return null

  if (tokens.length === 1)
    return (
      <div className="flex gap-2">
        <div className="flex flex-col justify-center">
          <TokenLogo tokenId={value} className="inline-block text-[1.2em]" />
        </div>
        <AssetPrice tokenId={value} />
      </div>
    )

  return (
    <Popover placement="bottom-start">
      <PopoverTrigger asChild>
        <button type="button" className="flex items-center gap-2 font-bold">
          <div className="flex flex-col justify-center">
            <TokenLogo tokenId={token.id} className="inline-block text-[1.2em]" />
          </div>
          <span>{token.symbol}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="bg-grey-900 rounded p-4">
          {tokens.map((t) => (
            <TokenSelectOption
              key={t.id}
              type="button"
              className="flex w-full items-center gap-2"
              onClick={() => onChange(t.id)}
            >
              <div className="flex flex-col justify-center">
                <TokenLogo tokenId={t.id} className="inline-block text-[1.2em]" />
              </div>
              <span>{t.symbol}</span>
              <span className="text-body-inactive text-xs">{t.coingeckoId}</span>
            </TokenSelectOption>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
  // return <ContextMenu>
  //   <ContextMenuTrigger asChild>

  //   </ContextMenuTrigger>

  // </ContextMenu>
}

export const TokenSelectOption: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  onClick,
  className,
  ...props
}) => {
  const { setOpen } = usePopoverContext()

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      setOpen(false)
    },
    [setOpen, onClick],
  )

  return (
    <button
      type="button"
      {...props}
      onClick={handleClick}
      className={classNames(
        "enabled:hover:bg-grey-800 focus-visible:bg-grey-800 disabled:text-body-disabled rounded-xs h-20 p-6 text-left",
        className,
      )}
    />
  )
}
