import { EarnMissingPositions } from "@ui/domains/Earn/components/EarnMissingPositions"
import { EarnPositionsList } from "@ui/domains/Earn/components/EarnPositionsList"
import { usePortfolioNetworkFilter } from "@ui/state/portfolio"
import { useSettingValue } from "@ui/state/settings"
import type { FC } from "react"

export const PopupEarnPositionsTab: FC<{
  search: string
}> = ({ search }) => {
  const sortBy = useSettingValue("earnPositionsSortBy")
  const groupBy = useSettingValue("earnPositionsGroupBy")
  const networkFilter = usePortfolioNetworkFilter() ?? null

  return (
    <div className="@container flex w-full flex-col @2xl:gap-8 gap-2 pb-4">
      <EarnPositionsList
        search={search}
        sortBy={sortBy}
        groupBy={groupBy}
        networkFilter={networkFilter}
      />
      <EarnMissingPositions className="text-sm" />
    </div>
  )
}
