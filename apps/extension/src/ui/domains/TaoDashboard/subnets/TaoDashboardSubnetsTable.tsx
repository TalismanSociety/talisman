import { bind } from "@react-rxjs/core"
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ChevronRightIcon,
  InfoIcon,
  ZapOffIcon,
  ZapPlusIcon,
} from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useBittensorBondModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondModal"
import { normalizeGreek } from "@ui/domains/Staking/Bittensor/utils/normalizeGreek"
import { cn } from "@ui/util/cn"
import { type FC, memo, type PropsWithChildren, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { BehaviorSubject } from "rxjs"
import { TokenLogo } from "../../Asset/TokenLogo"
import type { TimePeriod } from "../shared/types"
import { formatCompactNumber } from "../shared/util"
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

// keep track of sort setting globally so it persists across navigation
const sortSetting$ = new BehaviorSubject<SortSetting>(DEFAULT_SORT_SETTING)
const [useSortSetting] = bind(sortSetting$)

const useSetSortSetting = () =>
  useCallback((updater: SortSetting | ((prev: SortSetting) => SortSetting)) => {
    const next = typeof updater === "function" ? updater(sortSetting$.getValue()) : updater
    sortSetting$.next(next)
  }, [])

// Format number with appropriate precision
const formatNumber = (num: number, decimals = 2) => formatCompactNumber(num, decimals)

// Format price in TAO
const formatTaoPrice = (price: number | undefined) => {
  if (price === undefined) return "-"
  if (price === 0) return "0"
  if (price < 0.0001) return price.toFixed(6)
  if (price < 0.01) return price.toFixed(4)
  return price.toFixed(2)
}

// Mini sparkline chart component
const SparklineChart: FC<{ data: number[]; isPositive: boolean }> = ({ data, isPositive }) => {
  if (data.length <= 1) return null

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
    <svg width="60" height="20" className="overflow-visible" aria-hidden="true">
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
  const { t } = useTranslation()
  if (!sentiment) return null

  return (
    <span
      className={cn(
        "rounded px-4 py-1 text-tiny",
        sentiment === "bullish" && "bg-buy/20 text-buy",
        sentiment === "bearish" && "bg-sell/20 text-sell"
      )}
    >
      {sentiment === "bullish" ? t("Bullish") : t("Bearish")}
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
        isPositive && "text-buy",
        isNegative && "text-sell",
        !isPositive && !isNegative && "text-body-secondary"
      )}
    >
      {change > 0 ? "+" : ""}
      {change.toFixed(1)}%{isPositive && <ArrowUpRightIcon />}
      {isNegative && <ArrowDownRightIcon />}
    </span>
  )
}

export const TaoDashboardSubnetsTableHeader: FC = () => {
  const sortSetting = useSortSetting()
  const setSortSetting = useSetSortSetting()

  return <HeaderRow sortSetting={sortSetting} setSortSetting={setSortSetting} />
}

export const TaoDashboardSubnetsTable: FC<{
  search?: string
  period: TimePeriod
  hideHeader?: boolean
}> = ({ search = "", period, hideHeader = false }) => {
  const { subnets, stakeAddress, isLoading, loading, errors } = useTaoDashboardSubnets(period)
  const sortSetting = useSortSetting()
  const setSortSetting = useSetSortSetting()

  const filteredSubnets = useMemo(() => {
    const trimmedSearch = normalizeGreek(search.trim().toLowerCase())
    if (!trimmedSearch) return subnets

    return subnets.filter((subnet) => {
      return (
        normalizeGreek(subnet.token.subnetName?.toLowerCase() ?? "").includes(trimmedSearch) ||
        normalizeGreek(subnet.token.symbol.toLowerCase()).includes(trimmedSearch) ||
        `sn${subnet.netuid}`.includes(trimmedSearch) ||
        String(subnet.netuid).includes(trimmedSearch)
      )
    })
  }, [search, subnets])

  const sortedSubnets = useMemo(() => {
    return filteredSubnets.concat().sort((a, b) => {
      const valA = a[sortSetting.key]
      const valB = b[sortSetting.key]

      // Push undefined values to the end regardless of sort order
      if (valA === undefined && valB === undefined) return 0
      if (valA === undefined) return 1
      if (valB === undefined) return -1

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
      // biome-ignore lint/a11y/useSemanticElements: intentional div-based grid layout with ARIA roles
      <div
        role="table"
        className={cn(
          "w-full overflow-hidden bg-black-secondary",
          hideHeader ? "rounded-b-lg" : "rounded-lg"
        )}
      >
        {!hideHeader && <HeaderRow sortSetting={sortSetting} setSortSetting={setSortSetting} />}
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
    // biome-ignore lint/a11y/useSemanticElements: intentional div-based grid layout with ARIA roles
    <div
      role="table"
      className={cn(
        "w-full overflow-hidden bg-black-secondary",
        hideHeader ? "rounded-b-lg" : "rounded-lg"
      )}
    >
      {!hideHeader && <HeaderRow sortSetting={sortSetting} setSortSetting={setSortSetting} />}
      <div className="flex w-full flex-col gap-px overflow-hidden bg-grey-750">
        {sortedSubnets.map((subnet) => (
          <SubnetRow
            key={subnet.netuid}
            subnet={subnet}
            loading={loading}
            errors={errors}
            stakeAddress={stakeAddress}
          />
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
    // biome-ignore lint/a11y/useSemanticElements: intentional div-based grid layout with ARIA roles
    <button
      type="button"
      role="columnheader"
      aria-sort={sortOrder === "asc" ? "ascending" : sortOrder === "desc" ? "descending" : "none"}
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
  setSortSetting: (updater: SortSetting | ((prev: SortSetting) => SortSetting)) => void
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
    // biome-ignore lint/a11y/useSemanticElements: intentional div-based grid layout with ARIA roles
    // biome-ignore lint/a11y/useFocusableInteractive: child buttons are focusable
    <div
      role="row"
      className="grid h-20 w-full grid-cols-[160px_minmax(100px,1fr)_minmax(100px,1fr)_minmax(80px,0.7fr)_minmax(90px,0.9fr)_minmax(80px,0.8fr)_minmax(70px,0.7fr)_minmax(60px,0.5fr)_minmax(70px,0.6fr)_16px] items-center justify-items-start gap-4 bg-[#1a1a1a] px-8 text-body-inactive"
    >
      <HeaderCell
        sortOrder={getSortOrder("netuid")}
        onSortOrderToggle={handleSortToggle("netuid", "asc")}
      >
        {t("Subnet")}
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("priceChange")}
        onSortOrderToggle={handleSortToggle("priceChange", "desc")}
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
      <HeaderCell>{t("7d Price")}</HeaderCell>
      <HeaderCell>{/* Chevron column */}</HeaderCell>
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
    // biome-ignore lint/a11y/useSemanticElements: intentional div-based grid layout with ARIA roles
    <div
      role="cell"
      className={cn("flex flex-col items-start justify-center gap-1 text-left", className)}
    >
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
  stakeAddress: string | undefined
}> = memo(({ subnet, loading, errors, stakeAddress }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { open: openBondModal } = useBittensorBondModal()
  const isRoot = subnet.netuid === 0
  const canStake = !!stakeAddress
  const canUnstake = !!subnet.unstakeAddress

  // Compare last price to first price in 7d data to determine chart color
  const firstPrice = !subnet.chartData ? 0 : (subnet.chartData[0] ?? 0)
  const lastPrice = !subnet.chartData ? 0 : (subnet.chartData[subnet.chartData.length - 1] ?? 0)
  const isChartPositive = lastPrice > firstPrice
  const sentiment =
    subnet.sentiment === "bullish" || subnet.sentiment === "bearish" ? subnet.sentiment : null

  const handleRowClick = useCallback(() => {
    if (!isRoot) navigate(`/bittensor/subnets/${subnet.token.netuid}`)
  }, [isRoot, navigate, subnet.token.netuid])

  const handleStakeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!canStake) return
      openBondModal({
        stakeDirection: "bond",
        networkId: subnet.token.networkId,
        netuid: subnet.netuid,
        address: stakeAddress,
      })
    },
    [openBondModal, subnet.token.networkId, subnet.netuid, stakeAddress, canStake]
  )

  const handleUnstakeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!canUnstake) return
      openBondModal({
        stakeDirection: "unbond",
        networkId: subnet.token.networkId,
        netuid: subnet.netuid,
        address: subnet.unstakeAddress,
      })
    },
    [openBondModal, subnet.token.networkId, subnet.netuid, subnet.unstakeAddress, canUnstake]
  )

  return (
    // biome-ignore lint/a11y/useSemanticElements: intentional div-based grid layout with ARIA roles
    <div
      role="row"
      tabIndex={isRoot ? undefined : 0}
      aria-label={
        isRoot
          ? t("Root subnet")
          : t("View subnet {{name}}", {
              name: subnet.token.subnetName || `SN${subnet.token.netuid}`,
            })
      }
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (!isRoot && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          handleRowClick()
        }
      }}
      className={cn(
        "group grid h-32 w-full grid-cols-[160px_minmax(100px,1fr)_minmax(100px,1fr)_minmax(80px,0.7fr)_minmax(90px,0.9fr)_minmax(80px,0.8fr)_minmax(70px,0.7fr)_minmax(60px,0.5fr)_minmax(70px,0.6fr)_16px] items-center justify-items-start gap-4 bg-grey-900 px-8 text-left text-sm transition-colors",
        !isRoot && "cursor-pointer hover:bg-grey-800"
      )}
    >
      {/* Subnet */}
      <DataCell className="max-w-80 flex-row items-center gap-6 overflow-hidden">
        <TokenLogo tokenId={subnet.token.id} className="size-16 shrink-0" />
        <div className="flex grow flex-col gap-1 overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate font-semibold text-white">
              {isRoot
                ? "Root"
                : subnet.token.subnetName ||
                  t("Subnet {{netuid}}", { netuid: subnet.token.netuid })}
            </span>
            <span className="text-primary">{subnet.token.symbol}</span>
          </div>
          <span className="text-body-secondary text-xs">SN{subnet.token.netuid}</span>
        </div>
      </DataCell>

      {/* Price */}
      <DataCell error={!isRoot && errors.price}>
        {isRoot ? (
          <div className="font-medium text-white">1 τ</div>
        ) : loading.price && (subnet.priceTao === undefined || subnet.priceUsd === undefined) ? (
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
        {subnet.balance !== null ? (
          <>
            <div className={cn(loading.balance && "animate-pulse")}>
              <TokensAndFiat tokenId={subnet.token.id} planck={subnet.balance} noFiat isBalance />
            </div>
            {subnet.balanceUsd != null && (
              <FiatFromUsd
                amount={subnet.balanceUsd}
                className={cn("text-body-secondary text-xs", loading.balance && "animate-pulse")}
                isBalance
              />
            )}
          </>
        ) : loading.balance ? (
          <>
            <SkeletonBar className="h-8 w-24" />
            <SkeletonBar className="h-6 w-20" />
          </>
        ) : (
          <>
            <div>
              <TokensAndFiat tokenId={subnet.token.id} planck={0n} noFiat isBalance />
            </div>
            <FiatFromUsd amount={0} className="text-body-secondary text-xs" isBalance />
          </>
        )}
      </DataCell>

      {/* Score */}
      <DataCell error={errors.score}>
        {loading.score ? (
          <div className="flex flex-col gap-2">
            <SkeletonBar className="h-8 w-12" />
          </div>
        ) : isRoot ? (
          <span className="text-body-inactive">-</span>
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
            {subnet.netuid !== 0 && (
              <div className="text-body-secondary text-xs">
                {formatNumber(subnet.stakedAlpha)} {subnet.token.symbol}
              </div>
            )}
          </>
        )}
      </DataCell>

      {/* Volume */}
      <DataCell error={errors.volume}>
        {loading.volume ? (
          <SkeletonBar className="h-8 w-20" />
        ) : (
          <FiatFromUsd amount={subnet.volumeUsd} className="text-white" noCountUp compact />
        )}
      </DataCell>

      {/* MCap */}
      <DataCell error={errors.mcap}>
        {loading.mcap ? (
          <SkeletonBar className="h-8 w-28" />
        ) : isRoot ? (
          <span className="text-body-inactive">-</span>
        ) : (
          <FiatFromUsd amount={subnet.mcapUsd} className="text-white" noCountUp compact />
        )}
      </DataCell>

      {/* Emissions */}
      <DataCell error={errors.emission}>
        {loading.emission ? (
          <SkeletonBar className="h-8 w-20" />
        ) : isRoot ? (
          <span className="text-body-inactive">-</span>
        ) : (
          <span className={subnet.emission ? "text-white" : "text-body-inactive"}>
            {Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(subnet.emission)}%
          </span>
        )}
      </DataCell>

      {/* Chart / Stake+Unstake on hover (root always shows buttons) */}
      <DataCell>
        {!isRoot && (
          <div className="group-hover:hidden">
            {!loading.chart && !!subnet.chartData && (
              <SparklineChart data={subnet.chartData} isPositive={isChartPositive} />
            )}
          </div>
        )}
        <div
          className={cn(
            "items-center justify-center gap-2",
            isRoot ? "flex" : "hidden group-hover:flex"
          )}
        >
          <button
            type="button"
            aria-label={t("Stake")}
            disabled={!canStake}
            onClick={handleStakeClick}
            className={cn(
              "inline-flex size-14 items-center justify-center rounded-full",
              canStake
                ? "bg-grey-800 text-body-secondary hover:bg-primary/10 hover:text-primary"
                : "cursor-not-allowed bg-grey-800/50 text-body-disabled"
            )}
          >
            <ZapPlusIcon className="size-8" />
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <button
                  type="button"
                  aria-label={t("Unstake")}
                  disabled={!canUnstake}
                  onClick={handleUnstakeClick}
                  className={cn(
                    "inline-flex size-14 items-center justify-center rounded-full",
                    canUnstake
                      ? "bg-grey-800 text-body-secondary hover:bg-primary/10 hover:text-primary"
                      : "cursor-default bg-grey-800/50 text-body-disabled"
                  )}
                >
                  <ZapOffIcon className="size-8" />
                </button>
              </span>
            </TooltipTrigger>
            {!canUnstake && <TooltipContent>{t("No subnet balance")}</TooltipContent>}
          </Tooltip>
        </div>
      </DataCell>

      {/* Chevron — only for navigable subnets */}
      <DataCell>{!isRoot && <ChevronRightIcon className="size-8 opacity-60" />}</DataCell>
    </div>
  )
})
