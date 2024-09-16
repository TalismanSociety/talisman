import { EyeIcon, TalismanHandIcon } from "@talismn/icons"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"

import { AccountsList } from "./AccountsList"
import { UiTree } from "./types"
import { dataTreeToUiTree } from "./util"

export const ManageAccountsList = () => {
  const { t } = useTranslation("admin")
  const { balanceTotalPerAccount, catalog, accounts } = usePortfolioAccounts()

  const [portfolioUiTree, watchedUiTree] = useMemo(
    (): [UiTree, UiTree] => [
      dataTreeToUiTree(catalog.portfolio),
      dataTreeToUiTree(catalog.watched),
    ],
    [catalog]
  )

  return (
    <div>
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
    </div>
  )
}
