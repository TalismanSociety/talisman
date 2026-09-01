import type { DotNetworkId } from "@talismn/chaindata-provider"
import { PieChartIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useBittensorRootWeights } from "../hooks/useBittensorRootWeights"
import { ROOT_NETUID } from "../utils/constants"
import { getRootWeightsBreakdown } from "../utils/rootWeights"

const SLICE_COLORS = [
  "#d5ff5c",
  "#8b8bf9",
  "#f55cb1",
  "#ffb056",
  "#5cd8ff",
  "#7bdca4",
  "#ffe45c",
  "#e08bff",
]
const OTHERS_COLOR = "#5a5a5a"

type DonutSlice = { label: string; percent: number; color: string }

const RootWeightsDonut: FC<{ subnetCount: number; slices: DonutSlice[] }> = ({
  subnetCount,
  slices,
}) => {
  let startPercent = 0

  return (
    <div className="relative shrink-0">
      {/* r chosen so the circumference is 100: dash lengths are percentages */}
      <svg className="size-32" viewBox="0 0 36 36">
        {slices.map((slice) => {
          const dashOffset = 25 - startPercent
          startPercent += slice.percent
          return (
            <circle
              key={slice.label}
              cx="18"
              cy="18"
              r="15.9155"
              fill="none"
              stroke={slice.color}
              strokeWidth="3"
              strokeDasharray={`${slice.percent} ${100 - slice.percent}`}
              strokeDashoffset={dashOffset}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-body text-sm">
        {subnetCount}
      </div>
    </div>
  )
}

export const RootWeightsStat: FC<{
  networkId: DotNetworkId | undefined
  hotkey: string
}> = ({ networkId, hotkey }) => {
  const { t } = useTranslation()
  const { data: weights, isLoading, isError } = useBittensorRootWeights(networkId, hotkey)

  const breakdown = useMemo(() => {
    const raw = weights ? getRootWeightsBreakdown(weights) : null
    if (!raw) return null

    const topSlices = raw.topSlices.map<DonutSlice>(({ netuid, ratio }, index) => ({
      label: netuid === ROOT_NETUID ? "TAO" : `SN${netuid}`,
      percent: ratio * 100,
      color: SLICE_COLORS[index] ?? OTHERS_COLOR,
    }))
    const othersPercent = raw.othersRatio * 100
    const slices =
      othersPercent >= 0.05
        ? [...topSlices, { label: t("Others"), percent: othersPercent, color: OTHERS_COLOR }]
        : topSlices

    return { subnetCount: raw.subnetCount, slices }
  }, [weights, t])

  if (isLoading) return <div className="h-6 w-14 animate-pulse rounded-xs bg-grey-800" />
  if (isError) return null

  if (!breakdown)
    return (
      <Tooltip placement="left">
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <PieChartIcon />
            <span>–</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{t("No allocation set — earnings follow subnet emissions")}</TooltipContent>
      </Tooltip>
    )

  return (
    <Tooltip placement="left">
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <PieChartIcon />
          {breakdown.subnetCount}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-8 p-4">
          <RootWeightsDonut subnetCount={breakdown.subnetCount} slices={breakdown.slices} />
          <div className="flex min-w-64 flex-col gap-2">
            {breakdown.slices.map((slice) => (
              <div key={slice.label} className="flex items-center gap-4">
                <div className="size-3 rounded-full" style={{ backgroundColor: slice.color }} />
                <div className="text-body-secondary">{slice.label}</div>
                <div className="ml-auto text-body">{slice.percent.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
