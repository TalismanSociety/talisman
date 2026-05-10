import { EarnMissingPositions } from "@ui/domains/Earn/components/EarnMissingPositions"
import { EarnPositionsList } from "@ui/domains/Earn/components/EarnPositionsList"
import { usePortfolioNetworkFilter } from "@ui/state/portfolio"
import { useSettingValue } from "@ui/state/settings"
import type { FC } from "react"

export const DashboardEarnPositionsTab: FC<{
  search: string
}> = ({ search }) => {
  const sortBy = useSettingValue("earnPositionsSortBy")
  const groupBy = useSettingValue("earnPositionsGroupBy")
  const networkFilter = usePortfolioNetworkFilter() ?? null

  return (
    <div className="min-w-112.5 text-left text-base text-body-secondary">
      <EarnPositionsList
        search={search}
        sortBy={sortBy}
        groupBy={groupBy}
        networkFilter={networkFilter}
      />
      <EarnMissingPositions className="mt-8" />
    </div>
  )
}
