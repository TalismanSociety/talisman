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
          <div className="flex h-[20rem] items-center justify-center text-body-secondary">
            {t("Failed to fetch data")}
          </div>
        )}
      </div>
    </div>
  )
}

type SubnetHoldersData = NonNullable<ReturnType<typeof useSubnetHolders>["data"]>

const HoldersOverviewSkeleton = () => (
  <div className="flex h-[20rem] items-stretch gap-14">
    <div className="flex h-full w-1/3 shrink-0 flex-col items-start justify-between">
      <MetricsFieldSkeleton withExtra />
      <MetricsFieldSkeleton withExtra />
      <MetricsFieldSkeleton />
    </div>
    <div className="w-px self-stretch bg-grey-800" />
    <div className="h-full grow">
      <div className="relative size-full">
        <svg width="156" height="156" viewBox="0 0 156 156" className="size-full animate-pulse">
          <circle cx="78" cy="78" r={DONUT_RADIUS} fill="none" stroke="#262626" strokeWidth="12" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
          <span className="l text-white text-xs">
            <Skeleton className="w-56" />
          </span>
          <span className="font-medium text-lg text-white leading-[1.2]">
            <Skeleton className="w-20" />
          </span>
          <span className="font-bold text-sm leading-[1.2]">
            <Skeleton className="w-36" />
          </span>
        </div>
      </div>
    </div>
  </div>
)

const HoldersOverviewContent: FC<{ data: SubnetHoldersData }> = ({ data }) => {
  const { t } = useTranslation()

  // Concentration label based on top 10% concentration
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
      <div className="flex h-full w-1/3 shrink-0 flex-col items-start justify-between">
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
        <MetricsField label={t("10% Concentration")} extra={concentrationLabel}>
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

const DONUT_RADIUS = 72
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

const HoldersDonutChart: FC<{ data: SubnetHoldersData }> = ({ data }) => {
  const { t } = useTranslation()

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

  // Find the highest tier with holders (whale > shark > dolphin > fish > crab > shrimp)
  const highestTier = useMemo((): TierKey => {
    for (const key of TIER_ORDER) {
      const tier = tiers.find((t) => t.key === key)
      if (tier && tier.count > 0) return key
    }
    return "dolphin" // fallback
  }, [tiers])

  // Active tier is the last hovered tier, or highest tier if none hovered
  const [lastHoveredTier, setLastHoveredTier] = useState<TierKey | null>(null)
  const activeTier = lastHoveredTier ?? highestTier
  const activeTierData = tiers.find((t) => t.key === activeTier) ?? {
    key: activeTier,
    count: 0,
    percent: 0,
  }

  // Handle hover - set last hovered tier (persists after mouse leaves)
  const handleHover = (tier: TierKey | null) => {
    if (tier !== null) {
      setLastHoveredTier(tier)
    }
  }

  // Calculate visual segment data with proper sizing to avoid overlaps
  const segmentData = useMemo(() => {
    const gapSize = 16 // Gap between segments in pixels
    const minSegmentLength = 0 // Minimum visible segment length

    // Filter to only non-zero tiers
    const nonZeroTiers = tiers.filter((t) => t.percent > 0)
    if (nonZeroTiers.length === 0) return []

    // Total gap space needed
    const totalGapSpace = nonZeroTiers.length * gapSize
    const availableSpace = DONUT_CIRCUMFERENCE - totalGapSpace

    // Calculate minimum space needed if all segments were at minimum
    const totalMinSpace = nonZeroTiers.length * minSegmentLength

    // Calculate visual lengths proportionally
    let visualLengths: { tier: TierData; length: number }[]

    if (availableSpace <= totalMinSpace) {
      // Not enough space - give everyone equal minimum
      visualLengths = nonZeroTiers.map((tier) => ({
        tier,
        length: availableSpace / nonZeroTiers.length,
      }))
    } else {
      // Distribute: give everyone minimum, then distribute remainder by percentage
      const remainder = availableSpace - totalMinSpace
      const totalPercent = nonZeroTiers.reduce((sum, t) => sum + t.percent, 0)

      visualLengths = nonZeroTiers.map((tier) => ({
        tier,
        length: minSegmentLength + (tier.percent / totalPercent) * remainder,
      }))
    }

    // Calculate offsets based on visual lengths
    let offset = 0
    return visualLengths.map(({ tier, length }) => {
      const segment = {
        tier,
        length,
        offset: offset + gapSize / 2, // Center in gap
      }
      offset += length + gapSize
      return segment
    })
  }, [tiers])

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
        <circle cx="78" cy="78" r={DONUT_RADIUS} fill="none" stroke="#262626" strokeWidth="12" />
        {/* Tier segments */}
        {segmentData.map(({ tier, length, offset }) => {
          const isActive = tier.key === activeTier
          return (
            // biome-ignore lint/a11y/useSemanticElements: SVG g elements cannot be semantic HTML
            <g
              key={tier.key}
              role="button"
              tabIndex={0}
              className="cursor-pointer outline-none"
              onMouseEnter={() => handleHover(tier.key)}
              onFocus={() => handleHover(tier.key)}
            >
              <circle
                cx="78"
                cy="78"
                r="72"
                fill="none"
                stroke={TIER_CONFIG[tier.key].color}
                strokeWidth={12}
                strokeDasharray={`${length} ${DONUT_CIRCUMFERENCE - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                style={{
                  opacity: isActive ? 1 : 0.4,
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

const MetricsFieldSkeleton: FC<{ withExtra?: boolean }> = ({ withExtra }) => (
  <div className={cn("flex flex-col gap-2")}>
    <div className="text-body-inactive text-xs">
      <Skeleton className="w-32" />
    </div>
    <div className={cn("text-md")}>
      <Skeleton className="w-36" />
    </div>
    {!!withExtra && (
      <div className={cn("text-body-inactive text-xs")}>
        <Skeleton className="w-20" />
      </div>
    )}
  </div>
)

const Skeleton: FC<PropsWithChildren<{ className?: string }>> = ({ className }) => (
  <div
    className={cn(
      "my-px h-[0.9em] shrink-0 animate-pulse rounded-xs bg-grey-800 text-grey-800",
      className
    )}
  />
)
