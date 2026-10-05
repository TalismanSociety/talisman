import { bind } from "@react-rxjs/core"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { HeaderBlock } from "@ui/components/HeaderBlock"
import { Spacer } from "@ui/components/Spacer"
import {
  ManageAccountsLists,
  ManageAccountsProvider,
  ManageAccountsToolbar,
  ManageAccountsWelcome,
} from "@ui/domains/Account/ManageAccounts"
import { NewFolderModal } from "@ui/domains/Account/NewFolderModal"
import { accounts$, accountsCatalog$ } from "@ui/state/accounts"
import { balancesHydrate$ } from "@ui/state/balances"
import { useTranslation } from "react-i18next"
import { combineLatest } from "rxjs"

const [usePreload] = bind(combineLatest([accounts$, accountsCatalog$, balancesHydrate$]))

const Content = () => {
  const { t } = useTranslation()
  usePreload()

  return (
    <>
      <HeaderBlock title={t("Manage Accounts")} text={t("Organise and sort your accounts")} />
      <Spacer large />
      <ManageAccountsProvider>
        <ManageAccountsToolbar />
        <Spacer />
        <ManageAccountsLists />
      </ManageAccountsProvider>
      <NewFolderModal />
      <ManageAccountsWelcome />
    </>
  )
}

export const AccountsPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
