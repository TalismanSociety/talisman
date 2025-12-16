import { DEBUG } from "extension-shared"
import { FC, useState } from "react"
import { useTranslation } from "react-i18next"

import { SearchInput } from "@talisman/components/SearchInput"
import { EarnTabs } from "@ui/domains/Earn/EarnTabs"

import { EarnDiscoverTab } from "./components/EarnDiscoverTab"
import { EarnPageHeader } from "./components/EarnPageHeader"
import { EarnPositionsTab } from "./components/EarnPositionsTab"

const DEFAULT_TAB = DEBUG ? "discover" : "assets"

export const DashboardEarnPage: FC = () => {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState<"assets" | "discover">(DEFAULT_TAB)
  const [search, setSearch] = useState("")

  return (
    <div className="text-body-secondary flex w-full min-w-[45rem] flex-col gap-6 overflow-hidden text-left text-base">
      {/* Header with total balance - always show */}
      <EarnPageHeader />

      {/* Tabs and Search in same row */}
      <div className="mb-6 flex w-full items-center justify-between overflow-hidden">
        <div className="flex-shrink-0">
          <EarnTabs
            onTabChange={setSelectedTab}
            value={selectedTab}
            className="text-md my-0 h-14 w-auto font-bold"
          />
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

      {/* Tab Content */}
      <div>
        {selectedTab === "assets" && <EarnPositionsTab search={search} />}
        {selectedTab === "discover" && <EarnDiscoverTab search={search} />}
      </div>
    </div>
  )
}
