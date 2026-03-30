import { EarnAvailableProducts } from "@ui/domains/Earn/components/EarnAvailableProducts"
import { usePortfolioNetworkFilter } from "@ui/state/portfolio"
import { useSettingValue } from "@ui/state/settings"
import type { FC } from "react"

export const DashboardEarnDiscoverTab: FC<{ search: string }> = ({ search }) => {
  const sortBy = useSettingValue("earnDiscoverSortBy")
  const typeFilter = useSettingValue("earnDiscoverTypeFilter")
  const providerFilter = useSettingValue("earnDiscoverProviderFilter")
  const networkFilter = usePortfolioNetworkFilter() ?? null

  return (
    <div className="min-w-112.5 text-left text-base text-body-secondary">
      <div className="mb-6">
        <EarnAvailableProducts
          search={search}
          sortBy={sortBy}
          typeFilter={typeFilter}
          providerFilter={providerFilter}
          networkFilter={networkFilter}
        />
      </div>
    </div>
  )
}
