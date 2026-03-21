// ============================================================================
// Holders Overview Section
// ============================================================================

import { InfoIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useSubnetHolders } from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import { TextSkeleton as Skeleton } from "@ui/domains/TaoDashboard/shared/Skeleton"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { formatCompactNumber } from "@ui/domains/TaoDashboard/shared/util"
import { type FC, type PropsWithChildren, type ReactNode, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { SectionTitleBar } from "./SectionTitleBar"

// Tier configuration with colors matching the design
const TIER_CONFIG = {
  whale: { color: "#7256FF", taoRange: "> 1K τ" },
  dolphin: { color: "#FD8FFF", taoRange: "> 100 to 1K τ" },
  fish: { color: "#9BC7FF", taoRange: "> 10 to 100 τ" },
  shrimp: { color: "#FBF5D8", taoRange: "≤ 10 τ" },
} as const

type TierKey = keyof typeof TIER_CONFIG

// Ordered tiers from largest to smallest
const TIER_ORDER: TierKey[] = ["whale", "dolphin", "fish", "shrimp"]

interface TierData {
  key: TierKey
  count: number
  percent: number
}

export const SignalsHolderOverview: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<TimePeriod>("1w")
  const { data, isLoading } = useSubnetHolders(netuid, period)

  return (
    <div>
      <SectionTitleBar label={t("Holders Overview")} period={period} onPeriodChange={setPeriod} />

      <div className="rounded-lg bg-grey-900 px-12 py-8">
        {isLoading ? (
          <HoldersOverviewSkeleton />
        ) : data ? (
          <HoldersOverviewContent data={data} />
        ) : (
          <div className="flex h-[12.5rem] items-center justify-center text-body-secondary">
            {t("Failed to fetch data")}
          </div>
        )}
      </div>
    </div>
  )
}

type SubnetHoldersData = NonNullable<ReturnType<typeof useSubnetHolders>["data"]>

const HoldersOverviewSkeleton = () => (
  <div className="flex h-[12.5rem] items-stretch gap-14">
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

  return (
    <div className="flex h-[12.5rem] items-stretch gap-14">
      <div className="flex h-full w-1/3 shrink-0 flex-col items-start justify-between">
        <MetricsField
          label={t("Total Holders")}
          tooltip={t("Total number of unique wallets holding the subnet's alpha token")}
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
        <MetricsField
          label={t("Concentration")}
          tooltip={t(
            "Number of wallet addresses that fall within the top 10% of holders by TAO value"
          )}
        >
          {formatCompactNumber(data.top10Concentration)}
        </MetricsField>
        <MetricsField label={t("Average Trade")} tooltip={t("Average trade volume by holders")}>
          {data.avgTradePercent.toFixed(1)}%
        </MetricsField>
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

  // Find the highest tier with holders (whale > dolphin > fish > shrimp)
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
          <TierLabel tier={activeTier} />
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

const TierLabel: FC<{ tier: TierKey }> = ({ tier }) => {
  const { t } = useTranslation()
  return useMemo(() => {
    switch (tier) {
      case "whale":
        return t("Whales")
      case "dolphin":
        return t("Dolphins")
      case "fish":
        return t("Fish")
      case "shrimp":
        return t("Shrimps")
    }
  }, [tier, t])
}

const MetricsField: FC<
  PropsWithChildren<{
    label: ReactNode
    tooltip?: ReactNode
    extra?: ReactNode
    className?: string
    extraClassName?: string
  }>
> = ({ label, tooltip, extra, children, className, extraClassName }) => (
  <div className={cn("flex flex-col gap-2")}>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-body-inactive text-xs">
          {label}
          {!!tooltip && <InfoIcon />}
        </div>
      </TooltipTrigger>
      {!!tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>

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
