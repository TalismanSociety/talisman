// ============================================================================
// Trade Flow Section
// ============================================================================

import { cn } from "@talismn/util"
import { useSubnetStakeEvents } from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/TaoDashboardPeriodTabs"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { formatNumber, SectionTitleBar } from "./shared"

// Comparison bar showing two values side by side
const ComparisonBar: FC<{
  leftValue: number
  rightValue: number
  className?: string
}> = ({ leftValue, rightValue, className }) => {
  const total = leftValue + rightValue
  const leftPercent = total > 0 ? (leftValue / total) * 100 : 50
  const rightPercent = total > 0 ? (rightValue / total) * 100 : 50

  return (
    <div className={cn("flex h-1.5 w-full overflow-hidden rounded-full", className)}>
      <div className="h-full bg-red-500 transition-all" style={{ width: `${leftPercent}%` }} />
      <div className="h-full bg-green transition-all" style={{ width: `${rightPercent}%` }} />
    </div>
  )
}

export const SignalsTradeFlow: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<TimePeriod>("1W")
  const { data: stakeEvents, isLoading } = useSubnetStakeEvents(netuid)

  const metrics = useMemo(() => {
    if (!stakeEvents) {
      return {
        buys: 0,
        sells: 0,
        buyVol: 0,
        sellVol: 0,
        ratio: 1,
        ratioLabel: "Balanced",
        activeTraders: 0,
        buyers: 0,
        sellers: 0,
        avgTrade: 0,
        avgTradeLabel: "Retail flow",
      }
    }

    const now = Date.now()
    const periodMs =
      period === "1D"
        ? 24 * 60 * 60 * 1000
        : period === "1W"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000

    const filtered = stakeEvents.filter((e) => new Date(e.timestamp).getTime() > now - periodMs)

    const buys = filtered.filter((e) => e.method === "Adding")
    const sells = filtered.filter((e) => e.method === "Removing")

    const buyVol = buys.reduce((sum, e) => sum + parseFloat(e.taoAmount) / 1e9, 0)
    const sellVol = sells.reduce((sum, e) => sum + parseFloat(e.taoAmount) / 1e9, 0)

    const ratio = sellVol > 0 ? buyVol / sellVol : buyVol > 0 ? 999 : 1

    const buyAddresses = new Set(buys.map((e) => e.coldkey).filter(Boolean))
    const sellAddresses = new Set(sells.map((e) => e.coldkey).filter(Boolean))
    const allAddresses = new Set([...buyAddresses, ...sellAddresses])

    const totalVol = buyVol + sellVol
    const avgTrade = filtered.length > 0 ? totalVol / filtered.length : 0

    let ratioLabel = "Balanced"
    if (ratio >= 1.2) ratioLabel = "Bullish"
    else if (ratio <= 0.8) ratioLabel = "Bearish"

    const avgTradeLabel = avgTrade >= 10 ? "Whale flow" : "Retail flow"

    return {
      buys: buys.length,
      sells: sells.length,
      buyVol,
      sellVol,
      ratio,
      ratioLabel,
      activeTraders: allAddresses.size,
      buyers: buyAddresses.size,
      sellers: sellAddresses.size,
      avgTrade,
      avgTradeLabel,
    }
  }, [stakeEvents, period])

  if (isLoading) {
    return (
      <div className="rounded-xl bg-grey-900 p-5">
        <div className="h-48 animate-pulse rounded-lg bg-grey-800" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionTitleBar label={t("Trade Flow")} period={period} onPeriodChange={setPeriod} />
      {/* <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg text-white">Trade Flow</h3>
        <TimePeriodSelector value={period} onChange={setPeriod} />
      </div> */}

      <div className="rounded-xl bg-grey-900 p-5">
        <div className="flex gap-6">
          {/* Left Section - Paired Metrics */}
          <div className="flex-1 space-y-6">
            {/* Buys / Sells Row */}
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-body-secondary text-xs">Buys</span>
                  <div className="font-bold text-lg text-white">{metrics.buys}</div>
                </div>
                <div className="text-right">
                  <span className="text-body-secondary text-xs">Sells</span>
                  <div className="font-bold text-lg text-white">{metrics.sells}</div>
                </div>
              </div>
              <ComparisonBar leftValue={metrics.buys} rightValue={metrics.sells} className="mt-2" />
            </div>

            {/* Buy Vol / Sells Vol Row */}
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-body-secondary text-xs">Buy Vol</span>
                  <div className="font-bold text-lg">τ{formatNumber(metrics.buyVol, 0)}</div>
                </div>
                <div className="text-right">
                  <span className="text-body-secondary text-xs">Sells Vol</span>
                  <div className="font-bold text-lg">τ{formatNumber(metrics.sellVol, 0)}</div>
                </div>
              </div>
              <ComparisonBar
                leftValue={metrics.buyVol}
                rightValue={metrics.sellVol}
                className="mt-2"
              />
            </div>

            {/* Buyers / Sellers Row */}
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-body-secondary text-xs">Buyers</span>
                  <div className="font-bold text-lg text-white">{metrics.buyers}</div>
                </div>
                <div className="text-right">
                  <span className="text-body-secondary text-xs">Sellers</span>
                  <div className="font-bold text-lg text-white">{metrics.sellers}</div>
                </div>
              </div>
              <ComparisonBar
                leftValue={metrics.buyers}
                rightValue={metrics.sellers}
                className="mt-2"
              />
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-px self-stretch bg-grey-700" />

          {/* Right Section - Summary Stats */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <span className="text-body-secondary text-xs">Ratio</span>
              <div className="font-bold text-md text-white">{metrics.ratio.toFixed(2)}</div>
              <span className="text-body-secondary text-xs">{metrics.ratioLabel}</span>
            </div>

            <div>
              <span className="text-body-secondary text-xs">Active Traders</span>
              <div className="font-bold text-md text-white">{metrics.activeTraders}</div>
              <span className="text-body-secondary text-xs">Unique Wallets</span>
            </div>

            <div>
              <span className="text-body-secondary text-xs">Avg Trade</span>
              <div className="font-bold text-md text-white">{metrics.avgTrade.toFixed(1)}τ</div>
              <span className="text-body-secondary text-xs">{metrics.avgTradeLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
