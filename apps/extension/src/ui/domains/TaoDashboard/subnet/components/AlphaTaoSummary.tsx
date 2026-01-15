import { Icon } from "@iconify/react"
import { cn } from "@talismn/util"
import type { FC } from "react"
import { useMemo } from "react"

// Icon components using iconify
const TrendingUpIcon = () => <Icon icon="mdi:trending-up" className="size-16 text-[#26a69a]" />
const TrendingDownIcon = () => <Icon icon="mdi:trending-down" className="size-16 text-[#ef5350]" />

import { useSubnetStakeEvents, useSubnetTokenomics } from "../../hooks/useSn45Api"

interface AlphaTaoSummaryProps {
  netuid: number
  className?: string
}

function formatNumber(num: number, decimals = 0): string {
  if (num === 0) return "0"
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(decimals)
}

export const AlphaTaoSummary: FC<AlphaTaoSummaryProps> = ({ netuid, className }) => {
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: tokenomics, isLoading: tokenomicsLoading } = useSubnetTokenomics(netuid)

  const isLoading = stakeLoading || tokenomicsLoading

  // Calculate flow totals from stake events
  const flowTotals = useMemo(() => {
    if (!stakeEvents || stakeEvents.length === 0) {
      return { alphaIn: 0, alphaOut: 0, taoIn: 0, taoOut: 0 }
    }

    let alphaIn = 0
    let alphaOut = 0
    let taoIn = 0
    let taoOut = 0

    for (const event of stakeEvents) {
      const alpha = parseFloat(event.alphaAmount) / 1e9
      const tao = parseFloat(event.taoAmount) / 1e9

      if (event.method === "Adding") {
        alphaIn += alpha
        taoIn += tao
      } else {
        alphaOut += alpha
        taoOut += tao
      }
    }

    return { alphaIn, alphaOut, taoIn, taoOut }
  }, [stakeEvents])

  // Use tokenomics for more accurate totals if available
  const totals = useMemo(() => {
    if (tokenomics) {
      return {
        alphaIn: parseFloat(tokenomics.alphaIn) / 1e9,
        alphaOut: parseFloat(tokenomics.alphaOut) / 1e9,
        taoIn: flowTotals.taoIn,
        taoOut: flowTotals.taoOut,
      }
    }
    return flowTotals
  }, [tokenomics, flowTotals])

  const alphaNet = totals.alphaIn - totals.alphaOut
  const taoNet = totals.taoIn - totals.taoOut

  return (
    <div className={cn("flex w-full flex-col gap-4 md:flex-row md:gap-6", className)}>
      {/* Alpha Flow Summary */}
      <div className="flex flex-1 flex-col gap-2 rounded-lg border border-grey-750 bg-grey-850 p-4 md:p-6">
        <div className="text-body-secondary text-xs">Alpha Flow</div>
        {isLoading ? (
          <div className="h-10 w-full animate-pulse rounded-lg bg-grey-800" />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <TrendingUpIcon />
              <span className="font-medium text-[#26a69a] text-lg md:text-xl">
                {formatNumber(totals.alphaIn)}α In
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDownIcon />
              <span className="font-medium text-[#ef5350] text-lg md:text-xl">
                {formatNumber(totals.alphaOut)}α Out
              </span>
            </div>
            <div className="mt-2 border-grey-750 border-t pt-2">
              <span
                className={cn(
                  "font-bold text-xl md:text-2xl",
                  alphaNet >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"
                )}
              >
                {alphaNet >= 0 ? "+" : ""}
                {formatNumber(alphaNet)}α Net
              </span>
            </div>
          </div>
        )}
      </div>

      {/* TAO Flow Summary */}
      <div className="flex flex-1 flex-col gap-2 rounded-lg border border-grey-750 bg-grey-850 p-4 md:p-6">
        <div className="text-body-secondary text-xs">TAO Flow</div>
        {isLoading ? (
          <div className="h-10 w-full animate-pulse rounded-lg bg-grey-800" />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <TrendingUpIcon />
              <span className="font-medium text-[#26a69a] text-lg md:text-xl">
                {formatNumber(totals.taoIn, 1)}τ In
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDownIcon />
              <span className="font-medium text-[#ef5350] text-lg md:text-xl">
                {formatNumber(totals.taoOut, 1)}τ Out
              </span>
            </div>
            <div className="mt-2 border-grey-750 border-t pt-2">
              <span
                className={cn(
                  "font-bold text-xl md:text-2xl",
                  taoNet >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"
                )}
              >
                {taoNet >= 0 ? "+" : ""}
                {formatNumber(taoNet, 1)}τ Net
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
