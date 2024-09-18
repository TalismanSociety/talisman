import { EyeIcon, TalismanHandIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountJsonAny } from "extension-core"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"

import { AccountsList } from "./AccountsList"
import { useManageAccounts } from "./context"
import { UiTree, UiTreeItem } from "./types"
import { dataTreeToUiTree } from "./util"

const isAccountSearchMatch = (account: AccountJsonAny, lowerSearch: string) =>
  account.name?.toLowerCase().includes(lowerSearch) ??
  account.address?.toLowerCase().includes(lowerSearch) ??
  false

const recFilterTree =
  (lowerSearch: string, accountsMap: Record<string, AccountJsonAny>) =>
  (item: UiTreeItem): boolean => {
    switch (item.type) {
      case "account":
        return isAccountSearchMatch(accountsMap[item.address], lowerSearch)

      case "folder":
        return (
          item.name.toLowerCase().includes(lowerSearch) ||
          item.tree.some(recFilterTree(lowerSearch, accountsMap))
        )
    }
  }

const searchTree = (
  tree: UiTree,
  lowerSearch: string,
  accountsMap: Record<string, AccountJsonAny>
): UiTree => {
  return tree.filter(recFilterTree(lowerSearch, accountsMap)).map((item) => {
    if (item.type === "folder")
      return {
        ...item,
        tree: item.tree.filter(recFilterTree(lowerSearch, accountsMap)),
      }

    return item
  })
}

export const ManageAccountsList: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation("admin")
  const { balanceTotalPerAccount, catalog, accounts } = usePortfolioAccounts()

  const accountsMap = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.address, account])),
    [accounts]
  )
  const { search, isReordering } = useManageAccounts()

  const [portfolioUiTree, watchedUiTree] = useMemo(
    (): [UiTree, UiTree] => [
      dataTreeToUiTree(catalog.portfolio),
      dataTreeToUiTree(catalog.watched),
    ],
    [catalog]
  )

  const [portfolioTree, watchedTree] = useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return [
      searchTree(portfolioUiTree, lowerSearch, accountsMap),
      searchTree(watchedUiTree, lowerSearch, accountsMap),
    ]
  }, [portfolioUiTree, watchedUiTree, search, accountsMap])

  return (
    <div className={classNames("@container", className)}>
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
        tree={portfolioTree}
        allowReorder={isReordering}
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
        tree={watchedTree}
        allowReorder={isReordering}
      />
    </div>
  )
}
