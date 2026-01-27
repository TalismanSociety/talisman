import { InfoIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { type FC, type PropsWithChildren, useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { TokenLogo } from "../../Asset/TokenLogo"
import { ReactComponent as SortIcon } from "./sort-active.svg"
import {
  type TaoDashboardSubnet,
  useTaoDashboardSubnets,
  useTaoDashboardSubnetsLoading,
} from "./useTaoDashboardSubnets"

type SortOrder = "asc" | "desc"
type SortSetting = {
  key: keyof TaoDashboardSubnet
  order: SortOrder
}

const DEFAULT_SORT_SETTING: SortSetting = { key: "netuid", order: "asc" }

// Format number with appropriate precision
const formatNumber = (num: number, decimals = 2) => {
  if (num === 0) return "0"
  if (Math.abs(num) >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(2)}k`
  return num.toFixed(decimals)
}

// Format price in TAO
const formatTaoPrice = (price: number) => {
  if (price === 0) return "0"
  if (price < 0.0001) return price.toFixed(6)
  if (price < 0.01) return price.toFixed(4)
  return price.toFixed(2)
}

// Format USD price
const formatUsdPrice = (price: number) => {
  if (price === 0) return "$0"
  if (price >= 1000000000) return `$ ${(price / 1000000000).toFixed(1)}B`
  if (price >= 1000000) return `$ ${(price / 1000000).toFixed(1)}M`
  if (price < 0.01) return `$${price.toFixed(4)}`
  return `$${price.toFixed(2)}`
}

// Format large TAO amounts
const formatTaoAmount = (num: number) => {
  if (num === 0) return "0 τ"
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B τ`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M τ`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K τ`
  return `${num.toFixed(0)} τ`
}

// Format balance with commas
const formatBalance = (num: number) => {
  if (num === 0) return "0"
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

// Mini sparkline chart component
const SparklineChart: FC<{ data: number[]; isPositive: boolean }> = ({ data, isPositive }) => {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 60
      const y = 18 - ((value - min) / range) * 14
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width="60" height="20" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Sentiment badge component
const SentimentBadge: FC<{ sentiment: "bullish" | "bearish" | null }> = ({ sentiment }) => {
  if (!sentiment) return null

  return (
    <span
      className={cn(
        "ml-4 rounded px-4 py-1 text-[10px]",
        sentiment === "bullish" && "bg-green/20 text-green",
        sentiment === "bearish" && "bg-red-500/20 text-red-500"
      )}
    >
      {sentiment === "bullish" ? "Bullish" : "Bearish"}
    </span>
  )
}

// Price change indicator
const PriceChange: FC<{ change: number }> = ({ change }) => {
  const isPositive = change > 0
  const isNegative = change < 0

  return (
    <span
      className={cn(
        "flex items-center gap-1 whitespace-nowrap",
        isPositive && "text-green",
        isNegative && "text-red-500",
        !isPositive && !isNegative && "text-body-secondary"
      )}
    >
      {change > 0 ? "+" : ""}
      {change.toFixed(1)}%{isPositive && <span>↗</span>}
      {isNegative && <span>↘</span>}
    </span>
  )
}

export const TaoDashboardSubnetsTable = () => {
  const subnets = useTaoDashboardSubnets()
  const isLoading = useTaoDashboardSubnetsLoading()
  const [sortSetting, setSortSetting] = useState<SortSetting>(DEFAULT_SORT_SETTING)

  const sortedSubnets = useMemo(() => {
    return subnets.concat().sort((a, b) => {
      const valA = a[sortSetting.key]
      const valB = b[sortSetting.key]

      switch (typeof valA) {
        case "number":
          return sortSetting.order === "asc" ? valA - (valB as number) : (valB as number) - valA
        case "string":
          return sortSetting.order === "asc"
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string)
        default:
          return 0
      }
    })
  }, [subnets, sortSetting])

  if (isLoading && subnets.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg bg-black-secondary">
        <HeaderRow sortSetting={sortSetting} setSortSetting={setSortSetting} />
        <div className="flex w-full flex-col gap-px overflow-hidden bg-grey-750">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static list
            <div key={i} className="h-44 animate-pulse bg-grey-850" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden rounded-lg bg-black-secondary">
      <HeaderRow sortSetting={sortSetting} setSortSetting={setSortSetting} />
      <div className="flex w-full flex-col gap-px overflow-hidden bg-grey-750">
        {sortedSubnets.map((subnet) => (
          <SubnetRow key={subnet.netuid} subnet={subnet} />
        ))}
      </div>
    </div>
  )
}

const SortIndicator: FC<{ order?: SortOrder }> = ({ order }) => {
  return (
    <SortIcon
      className={cn(
        "size-12 shrink-0",
        order === "asc" && "rotate-180 text-primary",
        order === "desc" && "text-primary"
      )}
    />
  )
}

const HeaderCell: FC<
  PropsWithChildren<{
    sortOrder?: SortOrder
    onSortOrderToggle?: () => void
    className?: string
    showInfoIcon?: boolean
  }>
> = ({ children, sortOrder, onSortOrderToggle, className, showInfoIcon }) => {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-start gap-1 text-left text-body-secondary text-xs uppercase",
        onSortOrderToggle ? "cursor-pointer" : "cursor-default",
        className
      )}
      onClick={onSortOrderToggle}
    >
      <span className="whitespace-nowrap">{children}</span>
      {showInfoIcon && <InfoIcon className="size-12 shrink-0 text-body-disabled" />}
      {!!onSortOrderToggle && <SortIndicator order={sortOrder} />}
    </button>
  )
}

const HeaderRow: FC<{
  sortSetting: SortSetting
  setSortSetting: React.Dispatch<React.SetStateAction<SortSetting>>
}> = ({ sortSetting, setSortSetting }) => {
  const handleSortToggle = useCallback(
    (key: keyof TaoDashboardSubnet, first: SortOrder) => () => {
      setSortSetting((current) => {
        if (current.key !== key) return { key, order: first }

        return current.order === first
          ? { key, order: first === "asc" ? "desc" : "asc" }
          : DEFAULT_SORT_SETTING
      })
    },
    [setSortSetting]
  )

  const getSortOrder = useCallback(
    (key: keyof TaoDashboardSubnet): SortOrder | undefined => {
      if (sortSetting.key !== key) return undefined
      return sortSetting.order
    },
    [sortSetting]
  )

  return (
    <div className="grid h-36 w-full grid-cols-[minmax(120px,1.4fr),minmax(100px,1fr),minmax(100px,1fr),minmax(80px,0.7fr),minmax(90px,0.9fr),minmax(80px,0.8fr),minmax(70px,0.7fr),minmax(90px,0.8fr),minmax(70px,0.6fr)] items-center justify-items-start gap-4 bg-[#1a1a1a] px-8 text-body-inactive">
      <HeaderCell
        sortOrder={getSortOrder("netuid")}
        onSortOrderToggle={handleSortToggle("netuid", "asc")}
      >
        Subnet
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("price")}
        onSortOrderToggle={handleSortToggle("price", "desc")}
      >
        Price
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("balance")}
        onSortOrderToggle={handleSortToggle("balance", "desc")}
      >
        My Balance
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("score")}
        onSortOrderToggle={handleSortToggle("score", "desc")}
      >
        Score
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("stakedTao")}
        onSortOrderToggle={handleSortToggle("stakedTao", "desc")}
      >
        Staked
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("volume")}
        onSortOrderToggle={handleSortToggle("volume", "desc")}
      >
        Volume
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("mcap")}
        onSortOrderToggle={handleSortToggle("mcap", "desc")}
      >
        MCap
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("emission")}
        onSortOrderToggle={handleSortToggle("emission", "desc")}
      >
        Emissions
      </HeaderCell>
      <HeaderCell>Chart</HeaderCell>
    </div>
  )
}

const DataCell: FC<PropsWithChildren<{ className?: string }>> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col items-start justify-center text-left", className)}>
      {children}
    </div>
  )
}

const SubnetRow: FC<{ subnet: TaoDashboardSubnet }> = ({ subnet }) => {
  // Compare last price to first price in 7d data to determine chart color
  const firstPrice = subnet.chartData[0] ?? 0
  const lastPrice = subnet.chartData[subnet.chartData.length - 1] ?? 0
  const isChartPositive = lastPrice >= firstPrice
  const sentiment =
    subnet.sentiment === "bullish" || subnet.sentiment === "bearish" ? subnet.sentiment : null

  return (
    <Link
      to={`/bittensor/subnets/${subnet.netuid}`}
      className="grid h-44 w-full grid-cols-[minmax(120px,1.4fr),minmax(100px,1fr),minmax(100px,1fr),minmax(80px,0.7fr),minmax(90px,0.9fr),minmax(80px,0.8fr),minmax(70px,0.7fr),minmax(90px,0.8fr),minmax(70px,0.6fr)] items-center justify-items-start gap-4 bg-grey-900 px-8 text-left text-sm transition-colors hover:bg-grey-850"
    >
      {/* Subnet */}
      <DataCell className="flex-row items-center gap-6">
        <TokenLogo tokenId={subnet.tokenId} className="size-24 shrink-0" />
        <div className="flex flex-col gap-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{subnet.name}</span>
            <span className="text-primary">{subnet.greekSymbol}</span>
          </div>
          <span className="text-body-secondary text-xs">SN{subnet.netuid}</span>
        </div>
      </DataCell>

      {/* Price */}
      <DataCell>
        <div className="font-medium text-white">
          {formatTaoPrice(subnet.price)} <span className="text-primary">τ</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-body-secondary">{formatUsdPrice(subnet.priceUsd)}</span>
          <PriceChange change={subnet.priceChange} />
        </div>
      </DataCell>

      {/* My Balance */}
      <DataCell>
        {subnet.balance > 0 ? (
          <>
            <div className="text-green">
              {formatBalance(subnet.balance)} {subnet.greekSymbol}
            </div>
            <div className="text-body-secondary text-xs">${formatBalance(subnet.balanceUsd)}</div>
          </>
        ) : (
          <span className="text-body-secondary">0 {subnet.greekSymbol}</span>
        )}
      </DataCell>

      {/* Score */}
      <DataCell>
        <div className="flex flex-wrap items-center">
          <span className="font-medium text-white">{Math.round(subnet.score)}</span>
          <SentimentBadge sentiment={sentiment} />
        </div>
      </DataCell>

      {/* Staked */}
      <DataCell>
        <div className="text-white">
          {formatNumber(subnet.stakedTao)} <span className="text-primary">τ</span>
        </div>
        <div className="text-body-secondary text-xs">
          {formatNumber(subnet.stakedAlpha)} {subnet.greekSymbol}
        </div>
      </DataCell>

      {/* Volume */}
      <DataCell>
        <span className="text-white">{formatTaoAmount(subnet.volume)}</span>
      </DataCell>

      {/* MCap */}
      <DataCell>
        <span className="text-white">{formatTaoAmount(subnet.mcap)}</span>
      </DataCell>

      {/* Emissions */}
      <DataCell>
        <span className="text-white">{subnet.emission.toFixed(2)}%</span>
      </DataCell>

      {/* Chart */}
      <DataCell>
        <SparklineChart data={subnet.chartData} isPositive={isChartPositive} />
      </DataCell>
    </Link>
  )
}
