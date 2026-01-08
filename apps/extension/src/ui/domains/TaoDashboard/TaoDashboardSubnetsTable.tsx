import { cn } from "@talismn/util"
import { FC, PropsWithChildren, useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { TokenLogo } from "../Asset/TokenLogo"
import { ReactComponent as SortIcon } from "./sort-active.svg"
import { TaoDashboardSubnet, useTaoDashboardSubnets } from "./useTaoDashboardSubnets"

type SortOrder = "asc" | "desc"
type SortSetting = {
  key: keyof TaoDashboardSubnet
  order: SortOrder
}

const DEFAULT_SORT_SETTING: SortSetting = { key: "netuid", order: "asc" }

export const TaoDashboardSubnetsTable = () => {
  const subnets = useTaoDashboardSubnets()
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

  return (
    <div className="bg-black-secondary w-full overflow-hidden rounded-lg">
      <HeaderRow sortSetting={sortSetting} setSortSetting={setSortSetting} />
      <div className="bg-grey-750 flex w-full flex-col gap-px overflow-hidden">
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
        order === "asc" && "text-primary rotate-180",
        order === "desc" && "text-primary",
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
        onSortOrderToggle ? "cursor-pointer" : "cursor-default",
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
    [setSortSetting],
  )

  const getSortOrder = useCallback(
    (key: keyof TaoDashboardSubnet): SortOrder | undefined => {
      if (sortSetting.key !== key) return undefined
      return sortSetting.order
    },
    [sortSetting],
  )

  return (
    <div className="text-body-inactive grid h-24 w-full grid-cols-[0.5fr,2fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr] items-center gap-10 overflow-hidden bg-[#202020] px-10">
      <HeaderCell>#</HeaderCell>
      <HeaderCell>Subnet</HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("price")}
        onSortOrderToggle={handleSortToggle("price", "desc")}
      >
        Price
      </HeaderCell>
      <HeaderCell
        sortOrder={getSortOrder("score")}
        onSortOrderToggle={handleSortToggle("score", "desc")}
      >
        Score
      </HeaderCell>
      <HeaderCell>staked</HeaderCell>
      <HeaderCell>volume</HeaderCell>
      <HeaderCell>mcap</HeaderCell>
      <HeaderCell>emissions</HeaderCell>
      <HeaderCell>24h change</HeaderCell>
      <HeaderCell>chart</HeaderCell>
    </div>
  )
}

const DataCell: FC<PropsWithChildren<{ className?: string }>> = ({ children, className }) => {
  return <div className={cn("max-h-36 truncate", className)}>{children}</div>
}

const SubnetRow: FC<{ subnet: TaoDashboardSubnet }> = ({ subnet }) => {
  return (
    <Link
      to={`/bittensor/subnets/${subnet.netuid}`}
      className="hover:bg-grey-800 bg-grey-850 text-body grid h-36 w-full grid-cols-[0.5fr,2fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr] items-center gap-10 overflow-hidden px-10 text-left"
    >
      <DataCell>SN{subnet.netuid}</DataCell>
      <DataCell className="flex items-center gap-6">
        <TokenLogo tokenId={subnet.tokenId} className="size-20" />
        <span className="font-bold">{subnet.name}</span>
      </DataCell>
      <DataCell>
        {subnet.price.toFixed(2)}
        {/* <AssetPrice tokenId={subnet.tokenId} balances={null} /> */}
      </DataCell>
      <DataCell>{subnet.score.toFixed(2)}</DataCell>
      <DataCell>staked</DataCell>
      <DataCell>volume</DataCell>
      <DataCell>mcap</DataCell>
      <DataCell>emissions</DataCell>
      <DataCell>24h change</DataCell>
      <DataCell>chart</DataCell>
    </Link>
  )
}
