import HeaderBlock from "@talisman/components/HeaderBlock"
import { EyeIcon, FolderPlusIcon, TalismanHandIcon } from "@talisman/theme/icons"
import { AnalyticsPage } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import useAccounts from "@ui/hooks/useAccounts"
import useAccountsCatalog from "@ui/hooks/useAccountsCatalog"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import useBalances from "@ui/hooks/useBalances"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

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

export const Accounts = () => {
  const { t } = useTranslation("admin")
  useAnalyticsPageView(ANALYTICS_PAGE)

  const accounts = useAccounts()
  const balances = useBalances()
  const catalog = useAccountsCatalog()
  const [portfolioUiTree, watchedUiTree] = useMemo(
    (): [UiTree, UiTree] => [withIds(catalog.portfolio), withIds(catalog.watched)],
    [catalog]
  )
  const newFolderModal = useNewFolderModal()

  // TODO: "Followed only" section

  return (
    <Layout analytics={ANALYTICS_PAGE} withBack centered backTo="/settings">
      <HeaderBlock
        title={t("Manage Accounts")}
        text={t("Select which accounts are shown on your portfolio")}
      />
      <div className="mb-16 mt-24 flex gap-4">
        <button
          type="button"
          className="bg-primary text-body-black hover:bg-primary/80 flex items-center gap-3 rounded-sm p-4 text-sm"
          onClick={newFolderModal.open}
        >
          <FolderPlusIcon />
          Add new folder
        </button>
      </div>

      {watchedUiTree.length > 0 && (
        <div className="text-body-secondary mb-6 flex items-center gap-4 font-bold">
          <TalismanHandIcon className="inline" />
          <div>{t("My portfolio")}</div>
        </div>
      )}
      <AccountsList
        accounts={accounts}
        balances={balances}
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
        balances={balances}
        treeName="watched"
        tree={watchedUiTree}
      />
      <NewFolderModal />
      <RenameFolderModal />
      <DeleteFolderModal />
    </Layout>
  )
}
