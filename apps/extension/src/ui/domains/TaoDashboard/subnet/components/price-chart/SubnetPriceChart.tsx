import { Icon } from "@iconify/react"
import { cn } from "@talismn/util"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { type FC, useCallback, useMemo, useState } from "react"

import {
  useSubnetPrice,
  useSubnetStakeEvents,
  useSubnetTokenomics,
  useSubnetTweets,
  useTaoPrice,
} from "../../../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "../../../subnets/constants"
import { PriceChartGraph } from "./PriceChartGraph"
import { PriceChartHeader } from "./PriceChartHeader"
import { DEFAULT_INDICATORS, type IndicatorConfig, processStakeEventsToOHLC } from "./types"

interface SubnetPriceChartProps {
  netuid: number
  className?: string
}

export const SubnetPriceChart: FC<SubnetPriceChartProps> = ({ netuid, className }) => {
  const { data: priceData, isLoading: priceLoading } = useSubnetPrice(netuid)
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: tweets } = useSubnetTweets(netuid, 50)
  const { data: taoPrice } = useTaoPrice()
  const { data: tokenomics } = useSubnetTokenomics(netuid)
  const { subnetData } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  const [timeRange, setTimeRange] = useState(7) // days - default to 1W
  const [indicators, setIndicators] = useState<IndicatorConfig>(DEFAULT_INDICATORS)

  const toggleIndicator = useCallback((key: keyof IndicatorConfig) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const isLoading = priceLoading || stakeLoading

  // Get current subnet data for market cap, volume, etc.
  const currentSubnet = useMemo(() => {
    return subnetData.find((s) => Number(s.netuid) === netuid)
  }, [subnetData, netuid])

  // Process data
  const allHourlyData = useMemo(() => {
    if (!stakeEvents || !priceData) return []
    return processStakeEventsToOHLC(stakeEvents, priceData)
  }, [stakeEvents, priceData])

  // Filter by time range
  const hourlyData = useMemo(() => {
    if (timeRange === 0) return allHourlyData
    const cutoff = Date.now() - timeRange * 24 * 60 * 60 * 1000
    return allHourlyData.filter((d) => d.hour.getTime() >= cutoff)
  }, [allHourlyData, timeRange])

  // Current token price in TAO and USD
  const tokenPrice = tokenomics ? parseFloat(tokenomics.movingPrice) : null
  const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : null
  const tokenPriceUsd = tokenPrice && taoUsdPrice ? tokenPrice * taoUsdPrice : null

  // Calculate price change percentage (24h)
  const priceChange24h = currentSubnet?.price_change_1_day
    ? parseFloat(currentSubnet.price_change_1_day)
    : null

  // Market stats
  const marketCap = currentSubnet?.market_cap ? parseFloat(currentSubnet.market_cap) : null
  const volume24h = currentSubnet?.tao_volume_24_hr
    ? parseFloat(currentSubnet.tao_volume_24_hr) * (taoUsdPrice || 0)
    : null
  const totalAlpha = currentSubnet?.total_alpha ? parseFloat(currentSubnet.total_alpha) : null
  const fdv = totalAlpha && tokenPriceUsd ? totalAlpha * tokenPriceUsd : null

  // Daily emissions in TAO
  const emissionRaw = currentSubnet?.emission ? BigInt(currentSubnet.emission) : null
  const dailyEmissions = emissionRaw
    ? (Number(emissionRaw) / 1e9) * (7200 / (currentSubnet?.tempo || 360))
    : null

  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="rounded-lg bg-[#0d0d0d] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="h-16 w-48 animate-pulse rounded bg-grey-800" />
            <div className="h-8 w-64 animate-pulse rounded bg-grey-800" />
          </div>
          <div className="mt-4 flex h-[400px] items-center justify-center">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-grey-700" />
          </div>
        </div>
      </div>
    )
  }

  if (hourlyData.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="rounded-lg bg-[#0d0d0d] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Price Display */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-3xl text-white">
                  τ {tokenPrice?.toFixed(6) ?? "0.000000"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-body-secondary text-lg">
                  ${tokenPriceUsd?.toFixed(6) ?? "0.00"}
                </span>
                {priceChange24h !== null && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-sm",
                      priceChange24h >= 0 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {Math.abs(priceChange24h).toFixed(2)}%
                    <Icon
                      icon={priceChange24h >= 0 ? "mdi:arrow-top-right" : "mdi:arrow-bottom-right"}
                      className="size-4"
                    />
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex h-[400px] items-center justify-center text-body-secondary">
            No data available for this subnet.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="rounded-lg">
        <PriceChartHeader
          tokenPrice={tokenPrice}
          tokenPriceUsd={tokenPriceUsd}
          priceChange24h={priceChange24h}
          marketCap={marketCap}
          volume24h={volume24h}
          fdv={fdv}
          dailyEmissions={dailyEmissions}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          indicators={indicators}
          toggleIndicator={toggleIndicator}
        />

        <PriceChartGraph
          hourlyData={hourlyData}
          priceData={priceData ?? []}
          tweets={tweets ?? undefined}
          tokenPrice={tokenPrice}
          indicators={indicators}
        />
      </div>
    </div>
  )
}
