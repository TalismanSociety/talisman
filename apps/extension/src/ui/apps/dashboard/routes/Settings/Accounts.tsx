import { bind } from "@react-rxjs/core"
import { useTranslation } from "react-i18next"
import { combineLatest } from "rxjs"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { DeleteFolderModal } from "@ui/domains/Account/DeleteFolderModal"
import {
  ManageAccountsLists,
  ManageAccountsProvider,
  ManageAccountsToolbar,
  ManageAccountsWelcome,
} from "@ui/domains/Account/ManageAccounts"
import { NewFolderModal } from "@ui/domains/Account/NewFolderModal"
import { RenameFolderModal } from "@ui/domains/Account/RenameFolderModal"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { accounts$, accountsCatalog$, balancesHydrate$, balanceTotals$ } from "@ui/state"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Accounts",
}

const [usePreload] = bind(
  combineLatest([accounts$, accountsCatalog$, balanceTotals$, balancesHydrate$]),
)

const Content = () => {
  const { t } = useTranslation("admin")
  usePreload()
  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <>
      <HeaderBlock title={t("Accounts")} text={t("Organise and sort your accounts")} />
      <Spacer large />
      <ManageAccountsProvider>
        <ManageAccountsToolbar analytics={ANALYTICS_PAGE} />
        <Spacer />
        <ManageAccountsLists />
      </ManageAccountsProvider>
      <NewFolderModal />
      <RenameFolderModal />
      <DeleteFolderModal />
      <ManageAccountsWelcome />
    </>
  )
}

export const AccountsPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
