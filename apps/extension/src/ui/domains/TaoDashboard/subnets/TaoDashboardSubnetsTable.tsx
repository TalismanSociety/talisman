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
  if (num === 0) return "—"
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(decimals)
}

// Format price in TAO
const formatTaoPrice = (price: number) => {
  if (price === 0) return "—"
  if (price < 0.0001) return price.toFixed(6)
  if (price < 0.01) return price.toFixed(4)
  return price.toFixed(2)
}

// Format USD price
const formatUsdPrice = (price: number) => {
  if (price === 0) return "—"
  if (price < 0.01) return `$${price.toFixed(4)}`
  return `$${price.toFixed(2)}`
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
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loaders
            <div key={i} className="h-36 animate-pulse bg-grey-850" />
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
        order === "asc" && "rotate-180 text-primary",
        order === "desc" && "text-primary"
      )}
    />
  )
}

const HeaderCell: FC<
  PropsWithChildren<{ sortOrder?: SortOrder; onSortOrderToggle?: () => void }>
> = ({ children, sortOrder, onSortOrderToggle }) => {
  return (
    <button
      type="button"
      className={cn(
        "flex max-h-24 gap-1 overflow-hidden uppercase",
        onSortOrderToggle ? "cursor-pointer" : "cursor-default"
      )}
      onClick={onSortOrderToggle}
    >
      <span className="truncate">{children}</span>
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
    <div className="grid h-24 w-full grid-cols-[0.5fr,2fr,1fr,1fr,1fr,1fr,1fr] items-center gap-10 overflow-hidden bg-[#202020] px-10 text-body-inactive">
      <HeaderCell>#</HeaderCell>
      <HeaderCell>Subnet</HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("price")}
        onSortOrderToggle={handleSortToggle("price", "desc")}
      >
        Price (τ)
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("priceUsd")}
        onSortOrderToggle={handleSortToggle("priceUsd", "desc")}
      >
        Price (USD)
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("volume")}
        onSortOrderToggle={handleSortToggle("volume", "desc")}
      >
        Volume
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("netAlpha")}
        onSortOrderToggle={handleSortToggle("netAlpha", "desc")}
      >
        24h Flow
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("score")}
        onSortOrderToggle={handleSortToggle("score", "desc")}
      >
        Score
      </HeaderCell>
    </div>
  )
}

const DataCell: FC<PropsWithChildren<{ className?: string }>> = ({ children, className }) => {
  return <div className={cn("max-h-36 truncate", className)}>{children}</div>
}

// Flow direction badge component
const FlowBadge: FC<{ netAlpha: number; flowDirection: string }> = ({
  netAlpha,
  flowDirection,
}) => {
  const isInflow = flowDirection === "inflow"
  const isOutflow = flowDirection === "outflow"

  return (
    <div
      className={cn(
        "inline-flex items-center gap-4 rounded-full px-8 py-2 font-medium text-xs",
        isInflow && "bg-green/20 text-green",
        isOutflow && "bg-red-500/20 text-red-500",
        !isInflow && !isOutflow && "bg-grey-700 text-body-secondary"
      )}
    >
      {isInflow && "↑"}
      {isOutflow && "↓"}
      {!isInflow && !isOutflow && "→"}
      <span>
        {netAlpha >= 0 ? "+" : ""}
        {formatNumber(netAlpha, 1)}α
      </span>
    </div>
  )
}

const SubnetRow: FC<{ subnet: TaoDashboardSubnet }> = ({ subnet }) => {
  return (
    <Link
      to={`/bittensor/subnets/${subnet.netuid}`}
      className="grid h-36 w-full grid-cols-[0.5fr,2fr,1fr,1fr,1fr,1fr,1fr] items-center gap-10 overflow-hidden bg-grey-850 px-10 text-left text-body hover:bg-grey-800"
    >
      <DataCell>SN{subnet.netuid}</DataCell>
      <DataCell className="flex items-center gap-6">
        <TokenLogo tokenId={subnet.tokenId} className="size-20" />
        <span className="font-bold">{subnet.name}</span>
      </DataCell>
      <DataCell>{formatTaoPrice(subnet.price)}τ</DataCell>
      <DataCell>{formatUsdPrice(subnet.priceUsd)}</DataCell>
      <DataCell>{formatNumber(subnet.volume, 0)}</DataCell>
      <DataCell>
        <FlowBadge netAlpha={subnet.netAlpha} flowDirection={subnet.flowDirection} />
      </DataCell>
      <DataCell>{formatNumber(subnet.score, 1)}</DataCell>
    </Link>
  )
}
