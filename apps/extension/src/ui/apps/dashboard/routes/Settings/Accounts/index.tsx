import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { EyeIcon, FolderPlusIcon, TalismanHandIcon, UserPlusIcon } from "@talismn/icons"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import {
  accountsByCategoryAtomFamily,
  accountsCatalogAtom,
  balanceTotalsAtom,
  chainsMapAtomFamily,
} from "@ui/atoms"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { atom, useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { AccountsList } from "./AccountsList"
import { DeleteFolderModal } from "./DeleteFolderModal"
import { NewFolderModal, useNewFolderModal } from "./NewFolderModal"
import { RenameFolderModal } from "./RenameFolderModal"
import { UiTree } from "./types"
import { withIds } from "./util"

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

  const { balanceTotalPerAccount, catalog, accounts } = usePortfolioAccounts()

  const [portfolioUiTree, watchedUiTree] = useMemo(
    (): [UiTree, UiTree] => [withIds(catalog.portfolio), withIds(catalog.watched)],
    [catalog]
  )
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
      {watchedUiTree.length > 0 && (
        <div className="text-body-secondary mb-6 flex items-center gap-4 font-bold">
          <TalismanHandIcon className="inline" />
          <div>{t("My portfolio")}</div>
        </div>
      )}
      <AccountsList
        accounts={accounts}
        balanceTotalPerAccount={balanceTotalPerAccount}
        treeName="portfolio"
        tree={portfolioUiTree}
      />
      {watchedUiTree.length > 0 && (
        <div className="text-body-secondary mb-6 mt-8 flex items-center gap-4 font-bold">
          <EyeIcon className="inline" />
          <div>{t("Followed only")}</div>
        </div>
      )}
      <AccountsList
        accounts={accounts}
        balanceTotalPerAccount={balanceTotalPerAccount}
        treeName="watched"
        tree={watchedUiTree}
      />
      <NewFolderModal />
      <RenameFolderModal />
      <DeleteFolderModal />
    </DashboardLayout>
  )
}
