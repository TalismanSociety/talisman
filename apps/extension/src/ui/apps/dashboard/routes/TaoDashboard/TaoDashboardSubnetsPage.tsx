import { SearchInput } from "@ui/components/SearchInput"
import { EarnTabsDashboard } from "@ui/domains/Earn/components/EarnTabsDashboard"
import { TaoDashboardPeriodTabs } from "@ui/domains/TaoDashboard/shared/TaoDashboardPeriodTabs"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { TaoDashboardHeader } from "@ui/domains/TaoDashboard/subnets/TaoDashboardHeader"
import { TaoDashboardSubnetsTable } from "@ui/domains/TaoDashboard/subnets/TaoDashboardSubnetsTable"
import { useState } from "react"
import { useTranslation } from "react-i18next"

export const TaoDashboardSubnetsPage = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState<TimePeriod>("1w")

  return (
    <div className="flex w-full min-w-[28.125rem] flex-col gap-6 overflow-hidden">
      <TaoDashboardHeader />

      <div className="mb-6 flex w-full items-center justify-between overflow-hidden">
        <div className="flex-shrink-0">
          <EarnTabsDashboard />
        </div>
        <div className="flex w-[22.5rem] gap-2">
          <SearchInput
            containerClassName="h-[2.25rem] grow rounded-sm border !px-4 !bg-field ring-transparent focus-within:border-grey-700 border-field [&>svg]:size-8"
            className="text-sm"
            placeholder={t("Search")}
            onChange={setSearch}
            initialValue={search}
          />
          <div>
            <TaoDashboardPeriodTabs
              selected={period}
              onSelect={setPeriod}
              className="h-full gap-2 rounded-sm p-2 [&>button]:size-[2rem]"
            />
          </div>
        </div>
      </div>

      <div>
        <TaoDashboardSubnetsTable search={search} period={period} />
      </div>
    </div>
  )
}
