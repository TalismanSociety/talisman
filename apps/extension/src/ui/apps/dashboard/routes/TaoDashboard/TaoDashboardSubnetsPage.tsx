import { SearchInput } from "@ui/components/SearchInput"
import { EarnTabsDashboard } from "@ui/domains/Earn/components/EarnTabsDashboard"
import { TaoDashboardNetworkTabs } from "@ui/domains/TaoDashboard/shared/TaoDashboardNetworkTabs"
import { TaoDashboardPeriodTabs } from "@ui/domains/TaoDashboard/shared/TaoDashboardPeriodTabs"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { TaoDashboardHeader } from "@ui/domains/TaoDashboard/subnets/TaoDashboardHeader"
import {
  TaoDashboardSubnetsTable,
  TaoDashboardSubnetsTableHeader,
} from "@ui/domains/TaoDashboard/subnets/TaoDashboardSubnetsTable"
import { useState } from "react"
import { useTranslation } from "react-i18next"

export const TaoDashboardSubnetsPage = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState<TimePeriod>("1w")

  return (
    <div className="flex w-full min-w-112.5 flex-col">
      <TaoDashboardHeader />

      <div className="sticky top-0 z-10 flex flex-col gap-6 bg-black-primary pt-6">
        <EarnTabsDashboard />

        <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
          <div>
            <SearchInput
              containerClassName="h-[2.25rem] rounded-sm border px-4! bg-field! ring-transparent focus-within:border-grey-700 border-field [&>svg]:size-8"
              className="text-sm"
              placeholder={t("Search Subnet")}
              onChange={setSearch}
              initialValue={search}
            />
          </div>
          <div className="flex shrink-0 items-center gap-6">
            <TaoDashboardNetworkTabs className="h-[2.25rem] rounded-sm p-2" />
            <TaoDashboardPeriodTabs
              selected={period}
              onSelect={setPeriod}
              className="h-[2.25rem] shrink-0 gap-2 rounded-sm p-2 [&>button]:size-[2.25rem]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-t-lg bg-black-secondary">
          <TaoDashboardSubnetsTableHeader />
        </div>
      </div>

      <TaoDashboardSubnetsTable search={search} period={period} hideHeader />
    </div>
  )
}
