import { FolderPlusIcon, UserPlusIcon } from "@talismn/icons"
import { atom, useAtomValue } from "jotai"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import {
  accountsByCategoryAtomFamily,
  accountsCatalogAtom,
  balanceTotalsAtom,
  chainsMapAtomFamily,
} from "@ui/atoms"
import { DeleteFolderModal } from "@ui/domains/Account/DeleteFolderModal"
import { ManageAccountsList } from "@ui/domains/Account/ManageAccounts/ManageAccountsList"
import { NewFolderModal, useNewFolderModal } from "@ui/domains/Account/NewFolderModal"
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

  const newFolderModal = useNewFolderModal()
  const navigate = useNavigate()
  const addNewAccount = useCallback(() => navigate("/accounts/add"), [navigate])

  return (
    <DashboardLayout analytics={ANALYTICS_PAGE} centered>
      <HeaderBlock title={t("Accounts")} text={t("Organise and sort your accounts")} />
      <Spacer large />
      <div className="flex gap-4">
        <button
          type="button"
          className="bg-primary text-body-black hover:bg-primary/80 flex items-center gap-3 rounded p-4 text-xs"
          onClick={newFolderModal.open}
        >
          <FolderPlusIcon />
          {t("Add new folder")}
        </button>
        <button
          type="button"
          className="bg-primary text-body-black hover:bg-primary/80 flex items-center gap-3 rounded p-4 text-xs"
          onClick={addNewAccount}
        >
          <UserPlusIcon />
          {t("Add new account")}
        </button>
      </div>
      <Spacer />
      <ManageAccountsList />
      <NewFolderModal />
      <RenameFolderModal />
      <DeleteFolderModal />
    </DashboardLayout>
  )
}
