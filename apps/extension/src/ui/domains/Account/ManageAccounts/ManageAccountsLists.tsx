import { EyeIcon, TalismanHandIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountJsonAny } from "extension-core"
import { FC, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"

import { ManageAccountsList } from "./ManageAccountsList"
import { useManageAccounts } from "./ManageAccountsProvider"
import { UiTree, UiTreeAccount, UiTreeFolder } from "./types"
import { dataTreeToUiTree } from "./util"

export const ManageAccountsLists: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation("admin")
  const { balanceTotalPerAccount, catalog, accounts } = usePortfolioAccounts()

  const accountsMap = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.address, account])),
    [accounts],
  )
  const { search } = useManageAccounts()

  const [portfolioUiTree, watchedUiTree] = useMemo(
    (): [UiTree, UiTree] => [
      dataTreeToUiTree(catalog.portfolio),
      dataTreeToUiTree(catalog.watched),
    ],
    [catalog],
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
      {!!watchedUiTree.length && <Separator icon={TalismanHandIcon} label={t("My portfolio")} />}
      <ManageAccountsList
        accounts={accounts}
        balanceTotalPerAccount={balanceTotalPerAccount}
        treeName="portfolio"
        tree={portfolioTree}
      />
      {!!watchedUiTree.length && (
        <>
          {!!portfolioUiTree.length && <div className="h-8 shrink-0"></div>}
          <Separator icon={EyeIcon} label={t("Followed only")} />
          <ManageAccountsList
            accounts={accounts}
            balanceTotalPerAccount={balanceTotalPerAccount}
            treeName="watched"
            tree={watchedTree}
          />
        </>
      )}
    </div>
  )
}

const searchTree = (
  tree: UiTree,
  lowerSearch: string,
  accountsMap: Record<string, AccountJsonAny>,
): UiTree => {
  const workTree = structuredClone(tree)

  const setAccountVisibility = (item: UiTreeAccount) => {
    const account = accountsMap[item.address] as AccountJsonAny | undefined // may be undefined for a moment right after deletion
    item.isVisible =
      account?.name?.toLowerCase().includes(lowerSearch) ??
      account?.address?.toLowerCase().includes(lowerSearch) ??
      false
  }

  const setFolderVisibility = (item: UiTreeFolder) => {
    for (const child of item.tree) setAccountVisibility(child)
    item.isVisible =
      item.name.toLowerCase().includes(lowerSearch) || item.tree.some((item) => item.isVisible)
  }

  for (const item of workTree) {
    if (item.type === "account") setAccountVisibility(item)
    else setFolderVisibility(item)
  }

  return workTree
}

const Separator: FC<{ label: ReactNode; icon: FC<{ className?: string }> }> = ({
  icon: Icon,
  label,
}) => (
  <div className="text-body-disabled @xl:text-sm flex w-full items-center gap-4 text-xs font-bold">
    <Icon className="inline" />
    <div>{label}</div>
    <div className="bg-grey-800 h-0.5 grow"></div>
  </div>
)
