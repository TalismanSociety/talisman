import { atom, useAtomValue } from "jotai"
import { useTranslation } from "react-i18next"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardAdminLayout } from "@ui/apps/dashboard/layout"
import {
  accountsByCategoryAtomFamily,
  accountsCatalogAtom,
  balanceTotalsAtom,
  chainsMapAtomFamily,
} from "@ui/atoms"
import { DeleteFolderModal } from "@ui/domains/Account/DeleteFolderModal"
import {
  ManageAccountsLists,
  ManageAccountsProvider,
  ManageAccountsToolbar,
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

const preloadAtom = atom((get) =>
  Promise.all([
    get(accountsByCategoryAtomFamily("all")),
    get(accountsCatalogAtom),
    get(balanceTotalsAtom),
    get(chainsMapAtomFamily({ activeOnly: false, includeTestnets: false })),
  ])
)

export const AccountsPage = () => {
  const { t } = useTranslation("admin")
  useAtomValue(preloadAtom)
  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <DashboardAdminLayout analytics={ANALYTICS_PAGE} centered>
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
    </DashboardAdminLayout>
  )
}
