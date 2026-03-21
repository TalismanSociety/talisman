import { SearchInput } from "@ui/components/SearchInput"
import { EarnTabsDashboard } from "@ui/domains/Earn/components/EarnTabsDashboard"
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
    <div className="flex w-full min-w-[45rem] flex-col">
      <TaoDashboardHeader />

      <div className="sticky top-0 z-10 flex flex-col gap-6 bg-black-primary pt-6">
        <EarnTabsDashboard />

        <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
          <div>
            <SearchInput
              containerClassName="h-[3.6rem] rounded-sm border !px-4 !bg-field ring-transparent focus-within:border-grey-700 border-field [&>svg]:size-8"
              className="text-sm"
              placeholder={t("Search Subnet")}
              onChange={setSearch}
              initialValue={search}
            />
          </div>
          <div>
            <TaoDashboardPeriodTabs
              selected={period}
              onSelect={setPeriod}
              className="h-[3.6rem] shrink-0 gap-2 rounded-sm p-2 [&>button]:size-[3.6rem]"
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
