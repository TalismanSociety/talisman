import { AccountType, AccountsCatalogTree, TreeItem } from "@extension/core"
import { FloatingPortal, autoUpdate, useFloating } from "@floating-ui/react"
import { Listbox } from "@headlessui/react"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { ChevronDownIcon, EyeIcon, TalismanHandIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useSetting } from "@ui/hooks/useSettings"
import { forwardRef, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useSelectedAccount } from "./useSelectedAccount"

type AccountSelectItem =
  | {
      type: "account"
      key: string
      folderId?: string
      name: string
      address: string
      total?: number
      genesisHash?: string | null
      origin?: AccountType
      isPortfolio?: boolean
      signetUrl?: string
    }
  | {
      type: "folder"
      key: string
      treeName: AccountsCatalogTree
      id: string
      name: string
      total?: number
      addresses: string[]
    }
type AccountSelectFolderItem = AccountSelectItem & { type: "folder" }

export const AccountSelect = () => {
  const { t } = useTranslation()
  const { account: selectedAccount, select } = useSelectedAccount()
  const { accounts, catalog, balanceTotalPerAccount, portfolioTotal } = usePortfolioAccounts()
  const [collapsedFolders = [], setCollapsedFolders] = useSetting("collapsedFolders")

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
  })

  const [portfolioItems, watchedItems] = useMemo((): [AccountSelectItem[], AccountSelectItem[]] => {
    const treeItemToOptions =
      (treeName: AccountsCatalogTree, folderId?: string) =>
      (item: TreeItem): AccountSelectItem | AccountSelectItem[] => {
        const key = item.type === "account" ? `account-${item.address}` : item.id
        const account =
          item.type === "account"
            ? accounts.find((account) => account.address === item.address)
            : undefined

        return item.type === "account"
          ? {
              type: "account",
              key,
              folderId,
              name: account?.name ?? t("Unknown Account"),
              address: item.address,
              total: balanceTotalPerAccount?.[item.address] ?? 0,
              genesisHash: account?.genesisHash,
              origin: account?.origin,
              isPortfolio: !!account?.isPortfolio,
              signetUrl: account?.signetUrl as string | undefined,
            }
          : [
              {
                type: "folder",
                key,
                treeName,
                id: item.id,
                name: item.name,
                total: item.tree.reduce(
                  (sum, account) => sum + (balanceTotalPerAccount[account.address] ?? 0),
                  0
                ),
                addresses: item.tree.map((account) => account.address),
              },
              ...item.tree.flatMap(treeItemToOptions(treeName, key)),
            ]
      }

    return [
      catalog.portfolio.flatMap(treeItemToOptions("portfolio")),
      catalog.watched.flatMap(treeItemToOptions("watched")),
    ]
  }, [catalog.portfolio, catalog.watched, accounts, t, balanceTotalPerAccount])

  const selectedItem = useMemo(
    () =>
      selectedAccount &&
      [...portfolioItems, ...watchedItems].find(
        (item) => item.type === "account" && item.address === selectedAccount.address
      ),
    [selectedAccount, portfolioItems, watchedItems]
  )

  const onChange = useCallback(
    (item: AccountSelectItem | "all-accounts") =>
      item === "all-accounts" ? select(undefined) : item.type === "account" && select(item.address),
    [select]
  )

  const onFolderClick = useCallback(
    (item: AccountSelectFolderItem) =>
      setCollapsedFolders((collapsedFolders = []) =>
        collapsedFolders.includes(item.key)
          ? collapsedFolders.filter((key) => key !== item.key)
          : [...collapsedFolders, item.key]
      ),
    [setCollapsedFolders]
  )

  const { genericEvent } = useAnalytics()
  const trackClick = useCallback(
    (address?: string) => {
      genericEvent("select account(s)", {
        type: address ? (isEthereumAddress(address) ? "ethereum" : "substrate") : "all",
        from: "sidebar",
      })
    },
    [genericEvent]
  )

  return (
    <Listbox value={selectedItem} onChange={onChange}>
      {({ open }) => (
        <>
          {accounts.length === 0 && <NoAccountsItem />}
          {accounts.length > 0 && (
            <Listbox.Button ref={refs.setReference} className="w-full text-left">
              <Item
                ref={refs.setReference}
                key={selectedItem?.key}
                item={selectedItem}
                totalFiat={portfolioTotal}
                open={open}
                button
              />
            </Listbox.Button>
          )}
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              className={classNames(
                "bg-black-primary scrollable scrollable-700 z-10 max-h-[calc(100vh-12rem)] w-[27.2rem] overflow-y-auto overflow-x-hidden",
                "rounded-sm lg:rounded-t-none",
                open && "border-grey-800 border border-t-0"
              )}
              style={floatingStyles}
            >
              <Listbox.Options>
                {watchedItems.length > 0 && (
                  <div className="text-body-secondary flex items-center gap-4 p-4 font-bold">
                    <TalismanHandIcon className="inline" />
                    <div>{t("My portfolio")}</div>
                  </div>
                )}
                <Listbox.Option
                  className="w-full"
                  value="all-accounts"
                  onClick={() => trackClick()}
                >
                  <Item current={selectedItem === undefined} totalFiat={portfolioTotal} />
                </Listbox.Option>
                {portfolioItems.map((item) =>
                  item.type === "account" &&
                  item.folderId &&
                  collapsedFolders.includes(item.folderId) ? null : (
                    <Listbox.Option
                      className="w-full"
                      key={item.key}
                      value={item}
                      onClick={(event) => {
                        if (item.type === "account") trackClick(item.address)
                        if (item.type !== "folder") return
                        event.preventDefault()
                        event.stopPropagation()
                        onFolderClick(item)
                      }}
                    >
                      <Item
                        item={item}
                        collapsed={collapsedFolders.includes(item.key)}
                        current={item.key === selectedItem?.key}
                      />
                    </Listbox.Option>
                  )
                )}
                {watchedItems.length > 0 && (
                  <div className="text-body-secondary flex items-center gap-4 p-4 font-bold">
                    <EyeIcon className="inline" />
                    <div>{t("Followed only")}</div>
                  </div>
                )}
                {watchedItems.map((item) =>
                  item.type === "account" &&
                  item.folderId &&
                  collapsedFolders.includes(item.folderId) ? null : (
                    <Listbox.Option
                      className="w-full"
                      key={item.key}
                      value={item}
                      onClick={(event) => {
                        if (item.type !== "folder") return
                        event.preventDefault()
                        event.stopPropagation()
                        onFolderClick(item)
                      }}
                    >
                      <Item
                        item={item}
                        collapsed={collapsedFolders.includes(item.key)}
                        current={item.key === selectedItem?.key}
                      />
                    </Listbox.Option>
                  )
                )}
              </Listbox.Options>
            </div>
          </FloatingPortal>
        </>
      )}
    </Listbox>
  )
}

type ItemProps = {
  item?: AccountSelectItem
  collapsed?: boolean
  current?: boolean
  button?: boolean
  open?: boolean
  totalFiat?: number
}
const Item = forwardRef<HTMLDivElement, ItemProps>(function Item(
  { item, collapsed, current, button, open, totalFiat },
  ref
) {
  const { t } = useTranslation()

  const isAllAccounts = !item
  const isAccount = item && item.type === "account"
  const isFolder = item && item.type === "folder"

  if (isFolder) return <FolderItem {...{ ref, item, collapsed }} />

  const icon = isAllAccounts ? (
    <AllAccountsIcon className="shrink-0 text-3xl" />
  ) : isAccount ? (
    <AccountIcon
      className="shrink-0 text-3xl"
      address={item.address}
      genesisHash={item.genesisHash}
    />
  ) : isFolder ? (
    <AccountFolderIcon className="shrink-0 text-3xl" />
  ) : null

  const name = isAllAccounts ? (
    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">
      {t("All Accounts")}
    </div>
  ) : (
    <div
      className={classNames(
        "flex w-full items-center gap-2",
        button && "justify-center lg:justify-start",
        !button && "justify-start"
      )}
    >
      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">{item.name}</div>
      {isAccount && (
        <AccountTypeIcon className="text-primary" origin={item.origin} signetUrl={item.signetUrl} />
      )}
    </div>
  )

  return (
    <div
      ref={ref}
      className={classNames(
        "text-body-secondary flex w-full cursor-pointer items-center gap-4 p-5",

        !button && isAccount && item.folderId !== undefined && "bg-grey-900",
        !button && isFolder && "bg-grey-850",

        (current || (button && open)) && "!bg-grey-800 !text-body",
        !isFolder && "hover:bg-grey-800 focus:bg-grey-800 hover:text-body focus:text-body",

        button && "flex-col lg:flex-row",
        button && "rounded-sm",
        button && open && "lg:rounded-b-none",

        current && item === undefined && "hidden"
      )}
    >
      {icon}
      <div
        className={classNames(
          "max-w-full flex-grow flex-col justify-center gap-2 overflow-hidden",
          !button && "flex",
          button && "hidden items-center md:flex lg:items-start"
        )}
      >
        {name}
        <Fiat
          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
          amount={item?.total !== undefined ? item.total : totalFiat}
          isBalance
          noCountUp
        />
      </div>
      {(button || (isFolder && !collapsed)) && (
        <ChevronDownIcon className={classNames("shrink-0 text-lg", button && "hidden lg:block")} />
      )}
      {isFolder && collapsed && <div>{item.addresses.length}</div>}
    </div>
  )
})

type FolderItemProps = {
  item?: AccountSelectFolderItem
  collapsed?: boolean
}
const FolderItem = forwardRef<HTMLDivElement, FolderItemProps>(function FolderItem(
  { item, collapsed },
  ref
) {
  return (
    <div
      ref={ref}
      className="text-body-disabled bg-grey-850 flex w-full cursor-pointer items-center gap-2 p-2 text-sm"
    >
      <ChevronDownIcon
        className={classNames(
          "shrink-0 transition-transform",
          (collapsed || item?.addresses.length === 0) && "-rotate-90"
        )}
      />
      <div className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap">{item?.name}</div>
      <div className="text-xs">{item?.addresses.length}</div>
    </div>
  )
})

const NoAccountsItem = () => {
  const { t } = useTranslation()

  return (
    <div className="text-body-secondary flex w-full cursor-pointer flex-col items-center gap-4 rounded-sm p-5 lg:flex-row">
      <div className="bg-body-disabled h-20 w-20 rounded-[2rem]">&nbsp;</div>
      <div className="hidden max-w-full flex-grow flex-col items-center justify-center gap-2 overflow-hidden md:flex lg:items-start">
        {t("No Accounts")}
        <Fiat amount={0.0} />
      </div>
    </div>
  )
}
