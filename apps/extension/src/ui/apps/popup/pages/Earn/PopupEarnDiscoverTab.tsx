import { EarnAvailableProducts } from "@ui/domains/Earn/components/EarnAvailableProducts"
import { usePortfolioNetworkFilter } from "@ui/state/portfolio"
import { useSettingValue } from "@ui/state/settings"
import type { FC } from "react"

export const PopupEarnDiscoverTab: FC<{ search: string }> = ({ search }) => {
  const sortBy = useSettingValue("earnDiscoverSortBy")
  const typeFilter = useSettingValue("earnDiscoverTypeFilter")
  const providerFilter = useSettingValue("earnDiscoverProviderFilter")
  const networkFilter = usePortfolioNetworkFilter() ?? null

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="mb-4">
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
