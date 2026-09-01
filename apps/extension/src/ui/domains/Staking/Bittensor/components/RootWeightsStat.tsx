import type { DotNetworkId, SubDTaoToken } from "@talismn/chaindata-provider"
import { PieChartIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useTokens } from "@ui/state/chaindata"
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

const useSubnetNamesByNetuid = (networkId: DotNetworkId | undefined) => {
  const tokens = useTokens()

  return useMemo(
    () =>
      new Map(
        tokens
          .filter(
            (token): token is SubDTaoToken =>
              token.type === "substrate-dtao" &&
              !token.hotkey &&
              token.networkId === networkId &&
              !!token.subnetName
          )
          .map((token) => [token.netuid, token.subnetName as string])
      ),
    [tokens, networkId]
  )
}

const RootWeightsDonut: FC<{ subnetCount: number; slices: DonutSlice[] }> = ({
  subnetCount,
  slices,
}) => {
  let startPercent = 0

  return (
    <div className="relative shrink-0">
      {/* r chosen so the circumference is 100: dash lengths are percentages */}
      <svg className="size-[64px]" viewBox="0 0 36 36">
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
  const subnetNames = useSubnetNamesByNetuid(networkId)

  const breakdown = useMemo(() => {
    const raw = weights ? getRootWeightsBreakdown(weights) : null
    if (!raw) return null

    const getLabel = (netuid: number) => {
      if (netuid === ROOT_NETUID) return "TAO"
      const name = subnetNames.get(netuid)
      return name ? `SN${netuid} ${name}` : `SN${netuid}`
    }

    const topSlices = raw.topSlices.map<DonutSlice>(({ netuid, ratio }, index) => ({
      label: getLabel(netuid),
      percent: ratio * 100,
      color: SLICE_COLORS[index] ?? OTHERS_COLOR,
    }))
    const othersPercent = raw.othersRatio * 100
    const slices =
      othersPercent >= 0.05
        ? [...topSlices, { label: t("Others"), percent: othersPercent, color: OTHERS_COLOR }]
        : topSlices

    return { subnetCount: raw.subnetCount, slices }
  }, [weights, subnetNames, t])

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
        <div className="flex w-[200px] max-w-[200px] flex-col items-center gap-4 p-4">
          <RootWeightsDonut subnetCount={breakdown.subnetCount} slices={breakdown.slices} />
          <div className="flex w-full flex-col gap-2">
            {breakdown.slices.map((slice) => (
              <div key={slice.label} className="flex w-full items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div className="truncate text-body-secondary">{slice.label}</div>
                </div>
                <div className="shrink-0 text-body">{slice.percent.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
