import { SearchInput } from "@talisman/components/SearchInput"
import { EarnTabsDashboard } from "@ui/domains/Earn/components/EarnTabsDashboard"
import { TaoDashboardHeader } from "@ui/domains/TaoDashboard/subnets/TaoDashboardHeader"
import { TaoDashboardSubnetsTable } from "@ui/domains/TaoDashboard/subnets/TaoDashboardSubnetsTable"
import { useState } from "react"
import { useTranslation } from "react-i18next"

export const TaoDashboardSubnetsPage = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  return (
    <div className="flex w-full min-w-[45rem] flex-col gap-6 overflow-hidden">
      <TaoDashboardHeader />

      <div className="mb-6 flex w-full items-center justify-between overflow-hidden">
        <div className="flex-shrink-0">
          <EarnTabsDashboard />
        </div>
        <div className="w-[28rem]">
          <SearchInput
            containerClassName="h-[3.6rem] w-full rounded-sm border !px-4 !bg-field ring-transparent focus-within:border-grey-700 border-field [&>svg]:size-8"
            className="text-sm"
            placeholder={t("Search")}
            onChange={setSearch}
            initialValue={search}
          />
        </div>
      </div>

      <div>
        <TaoDashboardSubnetsTable search={search} />
      </div>
    </div>
  )
}
