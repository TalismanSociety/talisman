import { cn } from "@talismn/util"
import { FC, PropsWithChildren } from "react"

import { AssetPrice } from "../Asset/AssetPrice"
import { TokenLogo } from "../Asset/TokenLogo"
import { ReactComponent as SortIcon } from "./sort-active.svg"
import { TaoDashboardSubnet, useTaoDashboardSubnets } from "./useTaoDashboardSubnets"

type SortOrder = "asc" | "desc" | "none"

export const TaoDashboardSubnetsTable = () => {
  const subnets = useTaoDashboardSubnets()

  return (
    <div className="bg-black-secondary w-full overflow-hidden rounded-lg">
      <HeaderRow />
      <div className="bg-grey-750 flex w-full flex-col gap-px overflow-hidden">
        {subnets.map((subnet) => (
          <SubnetRow key={subnet.netuid} subnet={subnet} />
        ))}
      </div>
    </div>
  )
}

const SortIndicator: FC<{ order?: SortOrder }> = ({ order }) => {
  if (!order) return null
  return (
    <SortIcon
      className={cn(
        order === "asc" && "text-primary rotate-180",
        order === "desc" && "text-primary",
      )}
    />
  )
}

const HeaderCell: FC<PropsWithChildren<{ order?: SortOrder }>> = ({ children, order }) => {
  return (
    <div className={"overflow-hidden uppercase"}>
      <span>{children}</span>
      <SortIndicator order={order} />
    </div>
  )
}

const HeaderRow = () => {
  return (
    <div className="text-body-inactive grid h-24 w-full grid-cols-[0.5fr,2fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr] items-center gap-10 overflow-hidden bg-[#202020] px-10">
      <HeaderCell>
        #<SortIndicator />
      </HeaderCell>
      <HeaderCell order="none">Subnet</HeaderCell>
      <HeaderCell order="asc">Price</HeaderCell>
      <HeaderCell order="desc">90</HeaderCell>
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
  return <div className={cn("truncate", className)}>{children}</div>
}

const SubnetRow: FC<{ subnet: TaoDashboardSubnet }> = ({ subnet }) => {
  return (
    <button
      type="button"
      className="hover:bg-grey-800 bg-grey-850 text-body grid h-36 w-full grid-cols-[0.5fr,2fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr] items-center gap-10 overflow-hidden px-10 text-left"
    >
      <DataCell>SN{subnet.netuid}</DataCell>
      <DataCell className="flex items-center gap-6">
        <TokenLogo tokenId={subnet.tokenId} className="size-20" />
        <span className="font-bold">{subnet.name}</span>
      </DataCell>
      <DataCell>
        <AssetPrice tokenId={subnet.tokenId} balances={null} />
      </DataCell>
      <DataCell>90</DataCell>
      <DataCell>staked</DataCell>
      <DataCell>volume</DataCell>
      <DataCell>mcap</DataCell>
      <DataCell>emissions</DataCell>
      <DataCell>24h change</DataCell>
      <DataCell>chart</DataCell>
    </button>
  )
}
