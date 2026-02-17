import { ArrowDownRightIcon, ArrowUpRightIcon, InfoIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { type FC, type PropsWithChildren, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { TokenLogo } from "../../Asset/TokenLogo"
import { ReactComponent as SortIcon } from "./sort-active.svg"
import {
  type TaoDashboardSubnet,
  type TaoDashboardSubnetsErrors,
  type TaoDashboardSubnetsLoading,
  useTaoDashboardSubnets,
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
const formatTaoPrice = (price: number | undefined) => {
  if (price === undefined) return "-"
  if (price === 0) return "0"
  if (price < 0.0001) return price.toFixed(6)
  if (price < 0.01) return price.toFixed(4)
  return price.toFixed(2)
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
// const formatBalance = (num: number) => {
//   if (num === 0) return "0"
//   return num.toLocaleString("en-US", { maximumFractionDigits: 0 })
// }

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
        "rounded px-4 py-1 text-[10px]",
        sentiment === "bullish" && "bg-green/20 text-green",
        sentiment === "bearish" && "bg-red-500/20 text-red-500"
      )}
    >
      {sentiment === "bullish" ? "Bullish" : "Bearish"}
    </span>
  )
}

// Price change indicator
const PriceChange: FC<{ change: number | undefined }> = ({ change }) => {
  if (change === undefined) return null

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
      {change.toFixed(1)}%{isPositive && <ArrowUpRightIcon />}
      {isNegative && <ArrowDownRightIcon />}
    </span>
  )
}

export const TaoDashboardSubnetsTable: FC<{ search?: string }> = ({ search = "" }) => {
  const { subnets, isLoading, loading, errors } = useTaoDashboardSubnets()
  const [sortSetting, setSortSetting] = useState<SortSetting>(DEFAULT_SORT_SETTING)

  const filteredSubnets = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase()
    if (!trimmedSearch) return subnets

    return subnets.filter((subnet) => {
      return (
        subnet.token.subnetName?.toLowerCase().includes(trimmedSearch) ||
        subnet.token.symbol.toLowerCase().includes(trimmedSearch) ||
        `sn${subnet.netuid}`.includes(trimmedSearch) ||
        String(subnet.netuid).includes(trimmedSearch)
      )
    })
  }, [search, subnets])

  const sortedSubnets = useMemo(() => {
    return filteredSubnets.concat().sort((a, b) => {
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
  }, [filteredSubnets, sortSetting])

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
          <SubnetRow key={subnet.netuid} subnet={subnet} loading={loading} errors={errors} />
        ))}
      </div>
    </div>
  )
}

const SortIndicator: FC<{ order?: SortOrder }> = ({ order }) => {
  return (
    <SortIcon
      className={cn(
        "size-8 shrink-0",
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
      {showInfoIcon && <InfoIcon className="size-6 shrink-0 text-body-disabled" />}
      {!!onSortOrderToggle && <SortIndicator order={sortOrder} />}
    </button>
  )
}

const HeaderRow: FC<{
  sortSetting: SortSetting
  setSortSetting: React.Dispatch<React.SetStateAction<SortSetting>>
}> = ({ sortSetting, setSortSetting }) => {
  const { t } = useTranslation()

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
    <div className="grid h-20 w-full grid-cols-[160px,minmax(100px,1fr),minmax(100px,1fr),minmax(80px,0.7fr),minmax(90px,0.9fr),minmax(80px,0.8fr),minmax(70px,0.7fr),minmax(60px,0.5fr),minmax(70px,0.6fr)] items-center justify-items-start gap-4 bg-[#1a1a1a] px-8 text-body-inactive">
      <HeaderCell
        sortOrder={getSortOrder("netuid")}
        onSortOrderToggle={handleSortToggle("netuid", "asc")}
      >
        {t("Subnet")}
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("priceTao")}
        onSortOrderToggle={handleSortToggle("priceTao", "desc")}
      >
        {t("Price")}
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("balanceUsd")}
        onSortOrderToggle={handleSortToggle("balanceUsd", "desc")}
      >
        {t("Balance")}
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("score")}
        onSortOrderToggle={handleSortToggle("score", "desc")}
      >
        {t("Score")}
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("stakedTao")}
        onSortOrderToggle={handleSortToggle("stakedTao", "desc")}
      >
        {t("Staked")}
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("volume")}
        onSortOrderToggle={handleSortToggle("volume", "desc")}
      >
        {t("Volume")}
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("mcap")}
        onSortOrderToggle={handleSortToggle("mcap", "desc")}
      >
        {t("MCap")}
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("emission")}
        onSortOrderToggle={handleSortToggle("emission", "desc")}
      >
        {t("Em.")}
      </HeaderCell>
      <HeaderCell></HeaderCell>
    </div>
  )
}

const DataCell: FC<PropsWithChildren<{ error?: boolean; className?: string }>> = ({
  children,
  className,
  error,
}) => {
  const { t } = useTranslation()
  return (
    <div className={cn("flex flex-col items-start justify-center gap-1 text-left", className)}>
      {error === true ? <span className="text-body-inactive">{t("N/A")}</span> : children}
    </div>
  )
}

const SkeletonBar: FC<{ className?: string }> = ({ className }) => {
  return <div className={cn("h-4 animate-pulse rounded-xs bg-grey-700", className)} />
}

const SubnetRow: FC<{
  subnet: TaoDashboardSubnet
  loading: TaoDashboardSubnetsLoading
  errors: TaoDashboardSubnetsErrors
}> = ({ subnet, loading, errors }) => {
  const { t } = useTranslation()
  // Compare last price to first price in 7d data to determine chart color
  const firstPrice = !subnet.chartData ? 0 : (subnet.chartData[0] ?? 0)
  const lastPrice = !subnet.chartData ? 0 : (subnet.chartData[subnet.chartData.length - 1] ?? 0)
  const isChartPositive = lastPrice > firstPrice
  const sentiment =
    subnet.sentiment === "bullish" || subnet.sentiment === "bearish" ? subnet.sentiment : null

  return (
    <Link
      to={`/bittensor/subnets/${subnet.token.netuid}`}
      className="grid h-32 w-full grid-cols-[160px,minmax(100px,1fr),minmax(100px,1fr),minmax(80px,0.7fr),minmax(90px,0.9fr),minmax(80px,0.8fr),minmax(70px,0.7fr),minmax(60px,0.5fr),minmax(70px,0.6fr)] items-center justify-items-start gap-4 bg-grey-900 px-8 text-left text-sm transition-colors hover:bg-grey-800"
    >
      {/* Subnet */}
      <DataCell className="max-w-[160px] flex-row items-center gap-6 overflow-hidden">
        <TokenLogo tokenId={subnet.token.id} className="size-16 shrink-0" />
        <div className="flex grow flex-col gap-1 overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate font-semibold text-white">
              {subnet.token.subnetName || t("Subnet {{netuid}}", { netuid: subnet.token.netuid })}
            </span>
            <span className="text-primary">{subnet.token.symbol}</span>
          </div>
          <span className="text-body-secondary text-xs">SN{subnet.token.netuid}</span>
        </div>
      </DataCell>

      {/* Price */}
      <DataCell error={errors.price}>
        {loading.price && (subnet.priceTao === undefined || subnet.priceUsd === undefined) ? (
          <>
            <SkeletonBar className="h-8 w-32" />
            <SkeletonBar className="h-6 w-40" />
          </>
        ) : (
          <>
            <div className={cn("font-medium text-white", loading.price && "animate-pulse")}>
              {formatTaoPrice(subnet.priceTao)} τ
            </div>
            <div
              className={cn("flex items-center gap-2 text-xs", loading.price && "animate-pulse")}
            >
              <PriceChange change={subnet.priceChange} />
            </div>
          </>
        )}
      </DataCell>

      {/* My Balance */}
      <DataCell error={errors.balance}>
        {loading.balance ? (
          <>
            <SkeletonBar className="h-8 w-24" />
            <SkeletonBar className="h-6 w-20" />
          </>
        ) : subnet.balance ? (
          <>
            <div className="">
              <TokensAndFiat tokenId={subnet.token.id} planck={subnet.balance} noFiat isBalance />
            </div>
            {subnet.balanceUsd && (
              <FiatFromUsd
                amount={subnet.balanceUsd}
                className="text-body-secondary text-xs"
                isBalance
              />
            )}
          </>
        ) : (
          <span className="text-body-inactive">0 {subnet.token.symbol}</span>
        )}
      </DataCell>

      {/* Score */}
      <DataCell error={errors.score}>
        {loading.score ? (
          <div className="flex flex-col gap-2">
            <SkeletonBar className="h-8 w-12" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="font-medium text-white">{Math.round(subnet.score)}</span>
            <SentimentBadge sentiment={sentiment} />
          </div>
        )}
      </DataCell>

      {/* Staked */}
      <DataCell error={errors.staked}>
        {loading.staked ? (
          <>
            <SkeletonBar className="h-8 w-24" />
            <SkeletonBar className="h-6 w-20" />
          </>
        ) : (
          <>
            <div className="text-white">
              {subnet.stakedTao !== undefined ? `${formatNumber(subnet.stakedTao)} τ` : "-"}
            </div>
            <div className="text-body-secondary text-xs">
              {formatNumber(subnet.stakedAlpha)} {subnet.token.symbol}
            </div>
          </>
        )}
      </DataCell>

      {/* Volume */}
      <DataCell error={errors.volume}>
        {loading.volume ? (
          <SkeletonBar className="h-8 w-20" />
        ) : (
          <span className="text-white">{formatTaoAmount(subnet.volume)}</span>
        )}
      </DataCell>

      {/* MCap */}
      <DataCell error={errors.mcap}>
        {loading.mcap ? (
          <SkeletonBar className="h-8 w-28" />
        ) : (
          <span className="text-white">{formatTaoAmount(subnet.mcap)}</span>
        )}
      </DataCell>

      {/* Emissions */}
      <DataCell error={errors.emission}>
        {loading.emission ? (
          <SkeletonBar className="h-8 w-20" />
        ) : (
          <span className={subnet.emission ? "text-white" : "text-body-inactive"}>
            {Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(subnet.emission)}%
          </span>
        )}
      </DataCell>

      {/* Chart */}
      <DataCell>
        {!loading.chart && !!subnet.chartData && (
          <SparklineChart data={subnet.chartData} isPositive={isChartPositive} />
        )}
      </DataCell>
    </Link>
  )
}
