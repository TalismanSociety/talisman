import { Icon } from "@iconify/react"
import { cn } from "@talismn/util"
import type { FC } from "react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

// Icon components using iconify
const ActivityIcon = () => <Icon icon="mdi:chart-line" className="size-12" />
const UsersIcon = () => <Icon icon="mdi:account-group" className="size-12" />
const ZapIcon = () => <Icon icon="mdi:flash" className="size-12" />
const TrendingUpIcon = () => <Icon icon="mdi:trending-up" className="size-12" />
const TrendingDownIcon = () => <Icon icon="mdi:trending-down" className="size-12" />
const PieChartIcon = () => <Icon icon="mdi:chart-pie" className="size-12" />

import {
  useSubnetPositions,
  useSubnetStakeEvents,
  useSubnetTokenomics,
} from "../../hooks/useSn45Api"

interface TradingSignalsGridProps {
  netuid: number
  className?: string
}

interface TradingMetrics {
  buySellRatio24h: number
  uniqueTraders24h: number
  avgTradeSize: number
  tradesPerHour: number
  whaleConcentration: number
  totalHolders: number
  flowMomentum: "accumulating" | "distributing" | "neutral"
  flowMomentumValue: number
}

function computeTradingMetrics(
  stakeEvents: Array<{
    method: "Adding" | "Removing"
    taoAmount: string
    coldkey?: string
    timestamp: string
  }> | null,
  positions: Array<{ alphaBalance: string; coldkey: string }> | null,
  tokenomics: { emaTaoFlow: string } | null
): TradingMetrics {
  const now = Date.now()
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

  // Filter events to last 24h
  const recent24h = (stakeEvents ?? []).filter(
    (e) => new Date(e.timestamp).getTime() > twentyFourHoursAgo
  )

  // Buy/Sell counts and volumes
  const buys24h = recent24h.filter((e) => e.method === "Adding")
  const sells24h = recent24h.filter((e) => e.method === "Removing")

  const buyVolume = buys24h.reduce((sum, e) => sum + parseFloat(e.taoAmount) / 1e9, 0)
  const sellVolume = sells24h.reduce((sum, e) => sum + parseFloat(e.taoAmount) / 1e9, 0)

  // Buy/Sell Ratio (volume-weighted)
  const buySellRatio24h = sellVolume > 0 ? buyVolume / sellVolume : buyVolume > 0 ? 999 : 1

  // Unique traders in 24h
  const uniqueTraders24h = new Set(recent24h.map((e) => e.coldkey).filter(Boolean)).size

  // Average trade size (all time)
  const totalTaoVolume = (stakeEvents ?? []).reduce(
    (sum, e) => sum + parseFloat(e.taoAmount) / 1e9,
    0
  )
  const avgTradeSize =
    stakeEvents && stakeEvents.length > 0 ? totalTaoVolume / stakeEvents.length : 0

  // Trades per hour (24h average)
  const tradesPerHour = recent24h.length / 24

  // Whale concentration (top 10 holders % of total)
  const validPositions = (positions ?? []).filter((p) => parseFloat(p.alphaBalance) > 0)
  const totalAlpha = validPositions.reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)
  const top10Alpha = validPositions
    .slice(0, 10)
    .reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)
  const whaleConcentration = totalAlpha > 0 ? (top10Alpha / totalAlpha) * 100 : 0
  const totalHolders = validPositions.length

  // Flow momentum from EMA
  let flowMomentum: "accumulating" | "distributing" | "neutral" = "neutral"
  let flowMomentumValue = 0
  if (tokenomics?.emaTaoFlow) {
    flowMomentumValue = parseFloat(tokenomics.emaTaoFlow) / 1e9
    if (flowMomentumValue > 1000) {
      flowMomentum = "accumulating"
    } else if (flowMomentumValue < -1000) {
      flowMomentum = "distributing"
    }
  }

  return {
    buySellRatio24h,
    uniqueTraders24h,
    avgTradeSize,
    tradesPerHour,
    whaleConcentration,
    totalHolders,
    flowMomentum,
    flowMomentumValue,
  }
}

export const TradingSignalsGrid: FC<TradingSignalsGridProps> = ({ netuid, className }) => {
  const { t } = useTranslation()
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: positions, isLoading: positionsLoading } = useSubnetPositions(netuid)
  const { data: tokenomics, isLoading: tokenomicsLoading } = useSubnetTokenomics(netuid)

  const isLoading = stakeLoading || positionsLoading || tokenomicsLoading

  const tradingMetrics = useMemo(() => {
    return computeTradingMetrics(stakeEvents ?? null, positions ?? null, tokenomics ?? null)
  }, [stakeEvents, positions, tokenomics])

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-2">
        <span className="font-medium text-body text-sm">{t("Trading Signals")}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">24h</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {/* Buy/Sell Pressure */}
        <div className="group flex flex-col rounded-lg border border-grey-750 bg-grey-850 p-3 transition-all hover:border-grey-600">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-body-secondary uppercase tracking-wider">
            <ActivityIcon />
            Buy/Sell
          </div>
          {isLoading ? (
            <div className="h-6 w-16 animate-pulse rounded bg-grey-800" />
          ) : (
            <>
              <div
                className={cn(
                  "font-bold text-lg",
                  tradingMetrics.buySellRatio24h >= 1.2
                    ? "text-green"
                    : tradingMetrics.buySellRatio24h <= 0.8
                      ? "text-red-500"
                      : "text-body-secondary"
                )}
              >
                {tradingMetrics.buySellRatio24h >= 100
                  ? "∞"
                  : tradingMetrics.buySellRatio24h.toFixed(2)}
              </div>
              <div className="text-[9px] text-body-secondary">
                {tradingMetrics.buySellRatio24h >= 1.2
                  ? t("Bullish pressure")
                  : tradingMetrics.buySellRatio24h <= 0.8
                    ? t("Sell pressure")
                    : t("Balanced")}
              </div>
            </>
          )}
        </div>

        {/* Unique Traders */}
        <div className="group flex flex-col rounded-lg border border-grey-750 bg-grey-850 p-3 transition-all hover:border-grey-600">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-body-secondary uppercase tracking-wider">
            <UsersIcon />
            Active Traders
          </div>
          {isLoading ? (
            <div className="h-6 w-16 animate-pulse rounded bg-grey-800" />
          ) : (
            <>
              <div className="font-bold text-[#2563eb] text-lg">
                {tradingMetrics.uniqueTraders24h}
              </div>
              <div className="text-[9px] text-body-secondary">{t("Unique wallets")}</div>
            </>
          )}
        </div>

        {/* Avg Trade Size */}
        <div className="group flex flex-col rounded-lg border border-grey-750 bg-grey-850 p-3 transition-all hover:border-grey-600">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-body-secondary uppercase tracking-wider">
            <ZapIcon />
            Avg Trade
          </div>
          {isLoading ? (
            <div className="h-6 w-16 animate-pulse rounded bg-grey-800" />
          ) : (
            <>
              <div className="font-bold text-[#7c3aed] text-lg">
                {tradingMetrics.avgTradeSize.toFixed(1)}τ
              </div>
              <div className="text-[9px] text-body-secondary">
                {tradingMetrics.avgTradeSize >= 10 ? t("Whale activity") : t("Retail flow")}
              </div>
            </>
          )}
        </div>

        {/* Trade Velocity */}
        <div className="group flex flex-col rounded-lg border border-grey-750 bg-grey-850 p-3 transition-all hover:border-grey-600">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-body-secondary uppercase tracking-wider">
            <TrendingUpIcon />
            Velocity
          </div>
          {isLoading ? (
            <div className="h-6 w-16 animate-pulse rounded bg-grey-800" />
          ) : (
            <>
              <div className="font-bold text-[#ea580c] text-lg">
                {tradingMetrics.tradesPerHour.toFixed(1)}
              </div>
              <div className="text-[9px] text-body-secondary">{t("Trades/hour")}</div>
            </>
          )}
        </div>

        {/* Whale Concentration */}
        <div className="group flex flex-col rounded-lg border border-grey-750 bg-grey-850 p-3 transition-all hover:border-grey-600">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-body-secondary uppercase tracking-wider">
            <PieChartIcon />
            Top 10 Hold
          </div>
          {isLoading ? (
            <div className="h-6 w-16 animate-pulse rounded bg-grey-800" />
          ) : (
            <>
              <div
                className={cn(
                  "font-bold text-lg",
                  tradingMetrics.whaleConcentration >= 80
                    ? "text-red-500"
                    : tradingMetrics.whaleConcentration >= 60
                      ? "text-[#ea580c]"
                      : "text-green"
                )}
              >
                {tradingMetrics.whaleConcentration.toFixed(0)}%
              </div>
              <div className="text-[9px] text-body-secondary">
                {t("{{count}} holders", { count: tradingMetrics.totalHolders })}
              </div>
            </>
          )}
        </div>

        {/* Flow Momentum */}
        <div className="group flex flex-col rounded-lg border border-grey-750 bg-grey-850 p-3 transition-all hover:border-grey-600">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-body-secondary uppercase tracking-wider">
            <TrendingDownIcon />
            Momentum
          </div>
          {isLoading ? (
            <div className="h-6 w-16 animate-pulse rounded bg-grey-800" />
          ) : (
            <>
              <div
                className={cn(
                  "font-bold text-sm",
                  tradingMetrics.flowMomentum === "accumulating"
                    ? "text-green"
                    : tradingMetrics.flowMomentum === "distributing"
                      ? "text-red-500"
                      : "text-body-secondary"
                )}
              >
                {tradingMetrics.flowMomentum === "accumulating"
                  ? t("↗ Accumulating")
                  : tradingMetrics.flowMomentum === "distributing"
                    ? t("↘ Distributing")
                    : t("→ Neutral")}
              </div>
              <div className="text-[9px] text-body-secondary">{t("EMA TAO flow")}</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
