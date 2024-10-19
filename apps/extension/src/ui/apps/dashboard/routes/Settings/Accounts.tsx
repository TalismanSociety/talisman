import { useTranslation } from "react-i18next"

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

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Accounts",
}

// const preloadAtom = atom((get) =>
//   Promise.all([
//     get(accountsByCategoryAtomFamily("all")),
//     get(balanceTotalsAtom),
//     get(chainsMapAtomFamily({ activeOnly: false, includeTestnets: false })),
//   ])
// )

const Content = () => {
  const { t } = useTranslation("admin")
  //useAtomValue(preloadAtom) // TODO: preload
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
  <DashboardLayout sidebar="settings" width="660">
    <Content />
  </DashboardLayout>
)
