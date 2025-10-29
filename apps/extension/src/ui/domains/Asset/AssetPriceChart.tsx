import { Token, TokenId } from "@talismn/chaindata-provider"
import { CheckIcon, ChevronDownIcon, ExternalLinkIcon } from "@talismn/icons"
import { TokenRateCurrency } from "@talismn/token-rates"
import { classNames, formatPrice, isNotNil, isTruthy } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import ChartJs, { ActiveElement, ChartComponentLike, ChartEvent } from "chart.js/auto"
import { fetchFromCoingecko } from "extension-core"
import { log } from "extension-shared"
import { uniq } from "lodash-es"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Popover, PopoverContent, PopoverTrigger, usePopoverContext } from "talisman-ui"

import { useSelectedCurrency, useTokenRates, useTokenRatesMap, useTokensMap } from "@ui/state"

import { AssetPrice } from "./AssetPrice"
import { TokenDisplaySymbol } from "./TokenDisplaySymbol"
import { TokenLogo } from "./TokenLogo"

type ChartVariant = "small" | "large"

export const AssetPriceChart: FC<{
  tokenIds: TokenId[]
  variant: ChartVariant
  className?: string
}> = ({ tokenIds, variant, className }) => {
  const { t } = useTranslation()
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

    const tokens = uniq((tokensWithCoingeckoId || []).map((t) => t.coingeckoId))
      .filter(isTruthy)
      .map((coingeckoId) => tokensWithCoingeckoId.find((t) => t.coingeckoId === coingeckoId))
      .filter(isNotNil)

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
  useEffect(() => {
    // workaround empty button when changing account to one that doesnt have balance for the selecte done
    if (!selectableTokens.find((t) => t.id === selectedTokenId) && selectableTokens.length)
      setSelectedTokenId(selectableTokens[0].id)
  }, [selectedTokenId, selectableTokens])

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

  const handleCoingeckoClick = useCallback(() => {
    if (!coingeckoId) return

    window.open(
      `https://www.coingecko.com/en/coins/${coingeckoId}`,
      "_blank",
      "noopener noreferrer",
    )
  }, [coingeckoId])

  const [hoveredValue, setHoveredValue] = useState<number | null>(null)
  const formattedHoveredValue = useMemo(() => {
    return typeof hoveredValue === "number" ? formatPrice(hoveredValue, currency, true) : null
  }, [hoveredValue, currency])

  // Note : if prices array has only 1 entry, the token is in preview mode and we should not render the chart nor the price
  const isValid = useMemo(() => !prices || prices.length > 1, [prices])

  if (!selectedTokenId || !selectableTokens.length) return null

  return (
    <div
      className={classNames(
        "bg-black-secondary relative flex w-full shrink-0 flex-col gap-0 overflow-hidden rounded-sm",
        variant === "small" && "h-[16.8rem]",
        variant === "large" && "h-[19.2rem]",
        className,
      )}
    >
      <div
        className={classNames(
          "flex shrink-0 items-center justify-between",
          variant === "small" && "h-20 px-4",
          variant === "large" && "h-24 px-5",
        )}
      >
        <TokenSelect
          value={selectedTokenId}
          tokens={selectableTokens}
          variant={variant}
          onChange={setSelectedTokenId}
        />
        <div className="flex items-center gap-4">
          {isValid && (
            <div
              className={classNames(
                "text-body-secondary font-bold",
                variant === "small" && "text-base",
                variant === "large" && "text-[2rem]",
                formattedHoveredValue && "text-body",
              )}
            >
              {formattedHoveredValue ?? (
                <AssetPrice tokenId={selectedTokenId} balances={null} noChange />
              )}
            </div>
          )}
          <IconButton onClick={handleCoingeckoClick} className="text-base">
            <ExternalLinkIcon />
          </IconButton>
        </div>
      </div>

      {isValid && (
        <>
          <div className="grow overflow-hidden">
            {!!prices && (
              <Chart
                prices={prices}
                timespan={timespan}
                variant={variant}
                onHoverValueChange={setHoveredValue}
              />
            )}
            {/* use absolute position for buttons, above the graph, to not break the gradient */}
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0">
            <TimespanSelect value={timespan} variant={variant} onChange={setTimespan} />
          </div>
        </>
      )}
      {!isValid && (
        <div
          className={classNames(
            "text-body-inactive absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center",
            variant === "small" && "text-base",
            variant === "large" && "text-lg",
          )}
        >
          {t("No price history")}
        </div>
      )}
    </div>
  )
}

type ChartSpan = "H" | "D" | "W" | "M" | "Y" | "A"

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

      const getMarketChart = async (
        coingeckoId: string | null,
        vs_currency: TokenRateCurrency,
        days: string,
      ): Promise<{ prices: [number, number][] }> => {
        const query = new URLSearchParams({ vs_currency, days })
        const url = `/api/v3/coins/${coingeckoId}/market_chart?${query.toString()}`
        const result = await fetchFromCoingecko(url)
        if (!result.ok) throw new Error("Failed to fetch market chart for " + coingeckoId)
        return { prices: (await result.json())?.prices }
      }

      // We support showing balances in TAO just like we support BTC/ETH/DOT, but coingecko doesn't support TAO as a vs_currency rate.
      // We can macgyver our own TOKEN<>TAO rate by combining the TOKEN<>USD data with the TAO<>USD data.
      if (currency === "tao") {
        const taoUsdChart = await getMarketChart("bittensor", "usd", config.days)
        const tokenUsdChart = await getMarketChart(coingeckoId, "usd", config.days)

        const tokenTaoChart = tokenUsdChart.prices.map(
          ([timestamp, price], index): [number, number] => [
            timestamp,
            price / (taoUsdChart.prices[index]?.[1] ?? 1),
          ],
        )

        return { prices: tokenTaoChart }
      }

      // for any other currency, just return the result of getMarketChart
      return getMarketChart(coingeckoId, currency, config.days)
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
  })
}

const verticalLinePlugin: ChartComponentLike = {
  id: "verticalLine",
  afterDatasetsDraw(chart) {
    const { ctx, tooltip, chartArea } = chart

    if (tooltip && tooltip.opacity !== 0) {
      ctx.save()
      ctx.beginPath()
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = "rgba(213, 255, 92, 0.5)"
      ctx.lineWidth = 1
      ctx.moveTo(tooltip.caretX, tooltip.y + tooltip.height + 5) // start below the tooltip
      ctx.lineTo(tooltip.caretX, chartArea.bottom)
      ctx.stroke()
      ctx.restore()
    }
  },
}

ChartJs.register(verticalLinePlugin)

const Chart: FC<{
  prices: [number, number][]
  timespan: ChartSpan
  variant: ChartVariant
  onHoverValueChange: (price: number | null) => void
}> = ({ prices, timespan, variant, onHoverValueChange }) => {
  const refChart = useRef<HTMLCanvasElement>(null)
  const currency = useSelectedCurrency()

  useEffect(() => {
    const canvas = refChart.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // set min boundaries for y axis to ensure that timespan selector isn't drawn on the price line
    const allPrices = prices.map(([, price]) => price)
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const suggestedMin = minPrice - (maxPrice - minPrice) * 0.25

    // sometimes chart's onHover is called after mouse has left the canvas, so we need to track this
    let isHovering = false

    const onMouseEnter = () => {
      isHovering = true
    }
    const onMouseLeave = () => {
      isHovering = false
      onHoverValueChange(null)
    }

    canvas.addEventListener("mouseenter", onMouseEnter)
    canvas.addEventListener("mouseleave", onMouseLeave)

    const onHover = (event: ChartEvent, elements: ActiveElement[]) => {
      if (!isHovering || !elements.length) return
      try {
        const element = elements[0]
        const price = allPrices[element.index]
        onHoverValueChange(price)
      } catch (e) {
        log.warn("Failed to read hovered price", { event, elements })
        onHoverValueChange(null)
      }
    }

    // Create a gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
    gradient.addColorStop(0, "rgba(213, 255, 92, 0.2)") // Start color (top)
    gradient.addColorStop(1, "rgba(213, 255, 92, 0)") // End color (bottom)

    const chart = new ChartJs(canvas, {
      type: "line",
      options: {
        onHover,
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
        interaction: {
          // controls activeElements for onHover
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            mode: "index",
            intersect: false,
            displayColors: false,
            backgroundColor: "#2E3221",
            titleColor: "#d5ff5c",
            titleFont: {
              size: variant === "large" ? 14 : 12,
              weight: 400,
            },
            titleMarginBottom: 0,
            caretSize: 0,
            caretPadding: 40,
            yAlign: "bottom",
            callbacks: {
              title: function (tooltipItems) {
                const date = new Date(tooltipItems[0].label)
                return CHART_TIMESPANS[timespan].time
                  ? `${date.toLocaleDateString(window.navigator.language, { dateStyle: "short" })} ${date.toLocaleTimeString(window.navigator.language, { timeStyle: "short" })}`
                  : date.toLocaleDateString(window.navigator.language, { dateStyle: "short" })
              },
              label: function () {
                return ""
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              display: false,
              align: "start",
            },
            grid: {
              display: false,
              drawTicks: false,
            },
          },
          y: {
            suggestedMin,
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
        datasets: [
          {
            label: "Price",
            data: allPrices,
            borderColor: "#d5ff5c",
            pointRadius: 0,
            tension: 0.1,
            fill: true,
            backgroundColor: gradient,
            borderWidth: 2,
          },
        ],
      },
    })

    return () => {
      canvas.removeEventListener("mouseenter", onMouseEnter)
      canvas.removeEventListener("mouseleave", onMouseLeave)
      chart.destroy()
    }
  }, [currency, onHoverValueChange, prices, refChart, timespan, variant])

  return <canvas ref={refChart}></canvas>
}

const TimespanSelect: FC<{
  value: ChartSpan
  variant: ChartVariant
  onChange: (value: ChartSpan) => void
  className?: string
}> = ({ value, variant, onChange, className }) => {
  return (
    <div
      className={classNames(
        "text-body-secondary flex w-full shrink-0 items-center justify-center gap-2 font-bold",
        variant === "small" && "h-16",
        variant === "large" && "h-20",
        className,
      )}
    >
      {Object.entries(CHART_TIMESPANS).map(([key, { label }]) => (
        <button
          key={key}
          type="button"
          className={classNames(
            "rounded-[0.6rem] px-3 py-1.5 hover:bg-white/5 hover:text-white",
            "pointer-events-auto",
            variant === "small" && "text-[1rem]",
            variant === "large" && "text-sm",
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
  variant: ChartVariant
  onChange: (tokenId: TokenId) => void
}> = ({ tokens, value, variant, onChange }) => {
  const token = useMemo(() => tokens.find((t) => t.id === value), [tokens, value])

  if (!token || !tokens.length) return null

  if (tokens.length === 1)
    return (
      <div
        className={classNames(
          "flex items-center gap-2 p-2 font-bold",
          variant === "small" && "text-base",
          variant === "large" && "text-[2rem]",
        )}
      >
        <div className="flex flex-col justify-center">
          <TokenLogo tokenId={token.id} className="inline-block text-[1.2em]" />
        </div>
        <span>
          <TokenDisplaySymbol tokenId={token.id} />
        </span>
      </div>
    )

  return (
    <Popover placement="bottom-start">
      <PopoverTrigger asChild>
        <button
          type="button"
          className={classNames(
            "bg-grey-850 hover:bg-grey-800 group rounded",
            "flex items-center gap-2 p-2 font-bold",
            variant === "small" && "text-base",
            variant === "large" && "text-[2rem]",
          )}
        >
          <div className="flex flex-col justify-center">
            <TokenLogo tokenId={token.id} className="inline-block text-[1.2em]" />
          </div>
          <span>
            <TokenDisplaySymbol tokenId={token.id} />
          </span>
          <ChevronDownIcon className="text-body-secondary group-hover:text-body" />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="bg-grey-900 flex w-full flex-col gap-2 rounded p-4">
          {tokens.map((t) => (
            <TokenSelectOption
              key={t.id}
              token={t}
              selected={t.id === value}
              onClick={() => onChange(t.id)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const TokenSelectOption: FC<{ token: Token; selected: boolean; onClick: () => void }> = ({
  token,
  selected,
  onClick,
}) => {
  const { t } = useTranslation()
  const { setOpen } = usePopoverContext()

  const handleClick = useCallback(() => {
    onClick()
    setOpen(false)
  }, [setOpen, onClick])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={classNames(
        "enabled:hover:bg-grey-800 focus-visible:bg-grey-800 disabled:text-body-disabled rounded-xs h-20 p-6 px-3 text-left",
        "flex w-full items-center justify-between gap-16",
      )}
    >
      <div className="flex items-center gap-4">
        <TokenLogo tokenId={token.id} className="inline-block text-[2.8rem]" />
        <div className="flex grow flex-col gap-1">
          <span className="text-sm font-bold">{token.symbol}</span>
          <span className="text-body-secondary text-[1rem]">
            {t("Mkt Cap:")} <MarketCap tokenId={token.id} />
          </span>
        </div>
      </div>
      <div className="text-body flex gap-4 font-bold">
        <AssetPrice tokenId={token.id} balances={null} noTooltip noChange className="text-sm" />
        <CheckIcon
          className={classNames("text-primary text-base", selected ? "visible" : "invisible")}
        />
      </div>
    </button>
  )
}

const MarketCap: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
  const { t } = useTranslation()
  const tokenRates = useTokenRates(tokenId)
  const currency = useSelectedCurrency()

  const display = useMemo(
    () =>
      tokenRates?.[currency]?.marketCap
        ? new Intl.NumberFormat(undefined, {
            maximumSignificantDigits: 4,
            style: "currency",
            currency,
            currencyDisplay: currency === "usd" ? "narrowSymbol" : "symbol",
            notation: "compact",
          }).format(tokenRates[currency].marketCap)
        : t("unknown"),
    [tokenRates, currency, t],
  )

  return <span className="font-bold">{display}</span>
}
