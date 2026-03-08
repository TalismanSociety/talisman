import type { Account } from "@core/domains/keyring/exports"
import { isSs58Address, normalizeAddress } from "@talismn/crypto"
import { EyeIcon, TalismanHandIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { type FC, type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { ManageAccountsList } from "./ManageAccountsList"
import { useManageAccounts } from "./ManageAccountsProvider"
import type { UiTree, UiTreeAccount, UiTreeFolder } from "./types"
import { dataTreeToUiTree } from "./util"

export const ManageAccountsLists: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const { balanceTotals, catalog, accounts } = usePortfolioAccounts()

  const accountsMap = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.address, account])),
    [accounts]
  )
  const { search } = useManageAccounts()

  const [portfolioUiTree, watchedUiTree] = useMemo(
    (): [UiTree, UiTree] => [
      dataTreeToUiTree(catalog.portfolio),
      dataTreeToUiTree(catalog.watched),
    ],
    [catalog]
  )

  const [portfolioTree, watchedTree] = useMemo(() => {
    // if full search input is a valid SS58 address, normalize it for comparison
    let lowerSearch = search.toLowerCase()
    if (search && isSs58Address(search)) {
      try {
        lowerSearch = normalizeAddress(search).toLowerCase()
      } catch {
        // keep original lowerSearch
      }
    }
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
        balanceTotalPerAccount={balanceTotals}
        treeName="portfolio"
        tree={portfolioTree}
      />
      {!!watchedUiTree.length && (
        <>
          {!!portfolioUiTree.length && <div className="h-8 shrink-0"></div>}
          <Separator icon={EyeIcon} label={t("Followed only")} />
          <ManageAccountsList
            accounts={accounts}
            balanceTotalPerAccount={balanceTotals}
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
  accountsMap: Record<string, Account>
): UiTree => {
  const workTree = structuredClone(tree)

  const setAccountVisibility = (item: UiTreeAccount) => {
    const account = accountsMap[item.address] as Account | undefined // may be undefined for a moment right after deletion
    const normalizedAddress = (() => {
      try {
        return account?.address ? normalizeAddress(account.address).toLowerCase() : undefined
      } catch {
        return undefined
      }
    })()
    item.isVisible =
      account?.name?.toLowerCase().includes(lowerSearch) ||
      account?.address?.toLowerCase().includes(lowerSearch) ||
      normalizedAddress?.includes(lowerSearch) ||
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
  <div className="flex w-full items-center gap-4 font-bold @xl:text-sm text-body-disabled text-xs">
    <Icon className="inline" />
    <div>{label}</div>
    <div className="h-0.5 grow bg-grey-800"></div>
  </div>
)
