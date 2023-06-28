import HeaderBlock from "@talisman/components/HeaderBlock"
import { FolderPlusIcon } from "@talisman/theme/icons"
import { AnalyticsPage } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import useAccounts from "@ui/hooks/useAccounts"
import useAccountsPortfolio from "@ui/hooks/useAccountsPortfolio"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AccountsList } from "./AccountsList"
import { NewFolderModal, useNewFolderModal } from "./NewFolderModal"
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
  const portfolio = useAccountsPortfolio()
  const uiTree = useMemo((): UiTree => withIds(portfolio), [portfolio])

  const newFolderModal = useNewFolderModal()

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
      <AccountsList accounts={accounts} tree={uiTree} />
      <NewFolderModal />
    </Layout>
  )
}
