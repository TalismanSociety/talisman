// ============================================================================
// Holders Overview Section
// ============================================================================

import { cn } from "@talismn/util"
import { useSubnetHolders } from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/TaoDashboardPeriodTabs"
import { type FC, type PropsWithChildren, type ReactNode, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { formatCompactNumber, SectionTitleBar, useDaysFromPeriod } from "./shared"

// Tier configuration with colors matching the design
const TIER_CONFIG = {
  whale: { label: "Whale", color: "#22d3ee", taoRange: "10K+ τ" },
  shark: { label: "Shark", color: "#10b981", taoRange: "1K-10K τ" },
  dolphin: { label: "Dolphin", color: "#fd8fff", taoRange: "100-1K τ" },
  fish: { label: "Fish", color: "#3b82f6", taoRange: "10-100 τ" },
  crab: { label: "Crab", color: "#f59e0b", taoRange: "1-10 τ" },
  shrimp: { label: "Shrimp", color: "#6b7280", taoRange: "< 1 τ" },
} as const

type TierKey = keyof typeof TIER_CONFIG

// Ordered tiers from largest to smallest
const TIER_ORDER: TierKey[] = ["whale", "shark", "dolphin", "fish", "crab", "shrimp"]

interface TierData {
  key: TierKey
  count: number
  percent: number
}

export const SignalsHolderOverview: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<TimePeriod>("1W")

  const days = useDaysFromPeriod(period)
  const { data, isLoading } = useSubnetHolders(netuid, days)

  return (
    <div>
      <SectionTitleBar label={t("Holders Overview")} period={period} onPeriodChange={setPeriod} />

      <div className="rounded-lg bg-grey-900 px-12 py-8">
        {isLoading ? (
          <HoldersOverviewSkeleton />
        ) : data ? (
          <HoldersOverviewContent data={data} />
        ) : (
          t("No data available")
        )}
      </div>
    </div>
  )
}

type SubnetHoldersData = NonNullable<ReturnType<typeof useSubnetHolders>["data"]>

const HoldersOverviewSkeleton = () => null

const HoldersOverviewContent: FC<{ data: SubnetHoldersData }> = ({ data }) => {
  const { t } = useTranslation()

  // Concentration label based on top 10 concentration
  const concentrationLabel = useMemo(() => {
    if (!data || !("top10Concentration" in data)) return "Unknown"
    const concentration = data.top10Concentration
    if (concentration >= 80) return t("Institution heavy")
    if (concentration >= 60) return t("Whale heavy")
    if (concentration >= 40) return t("Mixed")
    return t("Distributed")
  }, [data, t])

  return (
    <div className="flex h-[20rem] items-stretch gap-14">
      <div className="flex h-full flex-col items-start justify-between">
        <MetricsField
          label={t("Total Holders")}
          extra={
            <>
              {data.holderChange > 0 ? "+" : ""}
              {data.holderChange}
            </>
          }
          extraClassName={cn(
            data.holderChange > 0 && "text-green",
            data.holderChange < 0 && "text-red-500"
          )}
        >
          {formatCompactNumber(data.totalHolders)}
        </MetricsField>
        <MetricsField label={t("Top 10 Concentration")} extra={concentrationLabel}>
          {formatCompactNumber(data.top10Concentration)}
        </MetricsField>
        <MetricsField label={t("Avg Trade")}>{data.avgTradePercent.toFixed(1)}%</MetricsField>
      </div>

      {/* Vertical Divider */}
      <div className="w-px self-stretch bg-grey-800" />

      {/* Right: Donut Chart */}
      <div className="h-full grow">
        <HoldersDonutChart data={data} />
      </div>
    </div>
  )
}

const HoldersDonutChart: FC<{ data: SubnetHoldersData }> = ({ data }) => {
  const { t } = useTranslation()
  const [hoveredTier, setHoveredTier] = useState<TierKey | null>(null)

  // Convert API data to tier array
  const tiers = useMemo((): TierData[] => {
    if (!data || !("breakdown" in data)) return []
    const { breakdown } = data
    return TIER_ORDER.map((key) => ({
      key,
      count: breakdown[key]?.count ?? 0,
      percent: breakdown[key]?.percent ?? 0,
    }))
  }, [data])

  // Find the biggest tier with holders (default selection)
  const defaultTier = useMemo((): TierKey => {
    const withHolders = tiers.filter((t) => t.count > 0)
    if (withHolders.length === 0) return "dolphin"
    // Return the tier with highest count
    return withHolders.reduce((max, t) => (t.count > max.count ? t : max), withHolders[0]).key
  }, [tiers])

  // Active tier is hovered tier or default
  const activeTier = hoveredTier ?? defaultTier
  const activeTierData = tiers.find((t) => t.key === activeTier) ?? {
    key: activeTier,
    count: 0,
    percent: 0,
  }

  return (
    <div className="relative size-full">
      {/* Donut chart SVG */}
      <svg
        width="156"
        height="156"
        viewBox="0 0 156 156"
        style={{ transform: "rotate(-90deg)" }}
        className="size-full"
      >
        {/* Background circle */}
        <circle cx="78" cy="78" r="72" fill="none" stroke="#262626" strokeWidth="12" />
        {/* Tier segments */}
        {tiers.map((tier) => {
          const circumference = 2 * Math.PI * 72
          let offset = 0
          for (const t of tiers) {
            if (t.key === tier.key) break
            offset += (t.percent / 100) * circumference
          }
          const length = (tier.percent / 100) * circumference
          if (length === 0) return null
          return (
            // biome-ignore lint/a11y/useSemanticElements: SVG g elements cannot be semantic HTML
            <g
              key={tier.key}
              role="button"
              tabIndex={0}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setHoveredTier(tier.key)}
              onMouseLeave={() => setHoveredTier(null)}
              onFocus={() => setHoveredTier(tier.key)}
              onBlur={() => setHoveredTier(null)}
            >
              <circle
                cx="78"
                cy="78"
                r="72"
                fill="none"
                stroke={TIER_CONFIG[tier.key].color}
                strokeWidth={hoveredTier === tier.key ? 16 : 12}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                style={{
                  opacity: hoveredTier && hoveredTier !== tier.key ? 0.4 : 1,
                  transition: "all 150ms",
                }}
              />
            </g>
          )
        })}
      </svg>

      {/* Center content overlay - positioned in the center of the SVG */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
        <span className="l text-white text-xs">
          {t(`{{tier}} Accounts`, { tier: TIER_CONFIG[activeTier].label })}
        </span>
        <span className="font-medium text-lg text-white leading-[1.2]">
          {formatCompactNumber(activeTierData.count)}
        </span>
        <span
          className="font-bold text-sm leading-[1.2]"
          style={{ color: TIER_CONFIG[activeTier].color }}
        >
          {activeTierData.percent.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

const MetricsField: FC<
  PropsWithChildren<{
    label: ReactNode
    extra?: ReactNode
    className?: string
    extraClassName?: string
  }>
> = ({ label, extra, children, className, extraClassName }) => (
  <div className={cn("flex flex-col gap-2")}>
    <div className="text-body-inactive text-xs">{label}</div>
    <div className={cn("text-md", className)}>{children}</div>
    {!!extra && <div className={cn("text-body-inactive text-xs", extraClassName)}>{extra}</div>}
  </div>
)
