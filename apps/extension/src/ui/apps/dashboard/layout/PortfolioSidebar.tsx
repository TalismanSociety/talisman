import { CheckIcon, EyeIcon, FolderPlusIcon, PlusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountsCatalogTree, AccountType, TreeItem } from "extension-core"
import { FC, Fragment, ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountsLogoStack } from "@ui/domains/Account/AccountsLogoStack"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"

export const PortfolioSidebar: FC = () => {
  return (
    <div className="bg-grey-900 size-full overflow-hidden rounded-lg">
      <ScrollContainer className="h-full w-full grow">
        <Accounts />
      </ScrollContainer>
    </div>
  )
}

const SidebarButtonBase: FC<{
  logo: ReactNode
  label: ReactNode
  fiat: ReactNode
  right?: ReactNode
  isSelected: boolean
  onClick: () => void
}> = ({ logo, label, fiat, right, isSelected, onClick }) => {
  return (
    <button
      type="button"
      className={classNames(
        " hover:bg-grey-750 flex h-28 items-center gap-4 rounded-[12px] px-4 text-left",
        isSelected && "bg-grey-800"
      )}
      onClick={onClick}
    >
      <div className="size-20 text-[4rem]">{logo}</div>
      <div className="flex grow flex-col justify-center gap-2 overflow-hidden">
        <div className="text-body-secondary truncate">{label}</div>
        <div className="text-body-disabled truncate text-xs">{fiat}</div>
      </div>
      <div>
        {isSelected ? (
          <div className="bg-primary flex size-10 items-center justify-center rounded-full text-xs text-black">
            <CheckIcon />
          </div>
        ) : (
          right
        )}
      </div>
    </button>
  )
}

type FolderAccountOption = {
  type: "folder"
  treeName: string
  id: string
  name: string
  total?: number
  addresses: string[]
}

type AccountAccountOption = {
  type: "account"
  name: string
  address: string
  total?: number
  genesisHash?: string | null
  origin?: AccountType
  isPortfolio?: boolean
  signetUrl?: string
}

type AccountOption = FolderAccountOption | AccountAccountOption

const Accounts = () => {
  const { t } = useTranslation()

  const { folder, treeName: folderTreeName } = useSearchParamsSelectedFolder()
  const { accounts, catalog, balanceTotalPerAccount } = usePortfolioAccounts()

  const [allPortfolioOptions, allWatchedOptions] = useMemo((): [
    AccountOption[],
    AccountOption[]
  ] => {
    const [portfolioTree, watchedTree] = (() => {
      if (folder && folderTreeName === "portfolio") return [folder.tree, []]
      if (folder && folderTreeName === "watched") return [[], folder.tree]
      return [catalog.portfolio, catalog.watched]
    })()

    const treeItemToOption =
      (treeName: AccountsCatalogTree) =>
      (item: TreeItem): AccountOption => {
        const account =
          item.type === "account"
            ? accounts.find((account) => account.address === item.address)
            : undefined

        return item.type === "account"
          ? {
              type: "account",
              name: account?.name ?? t("Unknown Account"),
              address: item.address,
              total: balanceTotalPerAccount?.[item.address] ?? 0,
              genesisHash: account?.genesisHash,
              origin: account?.origin,
              isPortfolio: !!account?.isPortfolio,
              signetUrl: account?.signetUrl as string | undefined,
            }
          : {
              type: "folder",
              treeName,
              id: item.id,
              name: item.name,
              total: item.tree.reduce(
                (sum, account) => sum + (balanceTotalPerAccount[account.address] ?? 0),
                0
              ),
              addresses: item.tree.map((account) => account.address),
            }
      }

    const filterEmptyFolders = (option: AccountOption) =>
      option.type !== "folder" || !!option.addresses.length

    return [
      portfolioTree.map(treeItemToOption("portfolio")).filter(filterEmptyFolders),
      watchedTree.map(treeItemToOption("watched")).filter(filterEmptyFolders),
    ]
  }, [
    folder,
    folderTreeName,
    catalog.portfolio,
    catalog.watched,
    accounts,
    t,
    balanceTotalPerAccount,
  ])

  return (
    <div className="flex w-full flex-col gap-8 p-8">
      <div className="flex h-16 shrink-0 items-center">
        <div className="grow text-[2rem] font-bold">{t("Accounts")}</div>
        <IconButton className="p-4">
          <FolderPlusIcon />
        </IconButton>
        <IconButton className="p-4">
          <PlusIcon />
        </IconButton>
      </div>
      <div className="bg-grey-800 h-0.5"></div>
      <TreeAccounts
        options={allPortfolioOptions}
        treeName="portfolio"
        balanceTotalPerAccount={balanceTotalPerAccount}
        showAllAccounts
      />
      {!!allWatchedOptions.length && (
        <>
          {!!allPortfolioOptions.length && <div className="bg-grey-800 h-0.5"></div>}
          <div className="flex items-center gap-4">
            <EyeIcon />
            <div className="text-sm">{t("Followed only")}</div>
          </div>
          <TreeAccounts
            options={allWatchedOptions}
            treeName="watched"
            balanceTotalPerAccount={balanceTotalPerAccount}
          />
        </>
      )}
    </div>
  )
}

const TreeAccounts: FC<{
  options: AccountOption[]
  treeName: AccountsCatalogTree
  balanceTotalPerAccount: Record<string, number>
  showAllAccounts?: boolean
}> = ({ options, treeName, balanceTotalPerAccount, showAllAccounts }) => {
  const { folder, treeName: folderTreeName } = useSearchParamsSelectedFolder()

  const folderOption = useMemo<FolderAccountOption | null>(() => {
    if (folder && folderTreeName === treeName)
      return {
        type: "folder",
        treeName,
        id: folder.id,
        name: folder.name,
        total: folder.tree.reduce(
          (sum, account) => sum + (balanceTotalPerAccount[account.address] ?? 0),
          0
        ),
        addresses: folder.tree.map((account) => account.address),
        searchContent: "", // unused here
      }

    return null
  }, [folder, folderTreeName, treeName, balanceTotalPerAccount])

  return (
    <div className="flex w-full flex-col gap-2">
      {showAllAccounts && <AllAccountsOption />}
      {folderOption && <FolderOption option={folderOption} />}
      {options.map((option) => (
        <Fragment key={option.type === "folder" ? option.id : option.address}>
          {option.type === "account" ? (
            <AccountOption option={option} />
          ) : (
            <FolderOption option={option} />
          )}
        </Fragment>
      ))}
    </div>
  )
}

const AccountOption = ({ option }: { option: AccountAccountOption }) => {
  const [searchParams, updateSearchParams] = useSearchParams()

  const handleClick = useCallback(() => {
    searchParams.delete("folder")
    searchParams.set("account", option.address)
    updateSearchParams(searchParams, { replace: true })
  }, [option.address, searchParams, updateSearchParams])

  const isSelected = useMemo(() => {
    return searchParams.get("account") === option.address
  }, [option.address, searchParams])

  return (
    <SidebarButtonBase
      label={
        <div className="flex w-full items-center gap-2">
          <div className="truncate">{option.name ?? shortenAddress(option.address)}</div>
          <AccountTypeIcon className="text-primary shrink-0" origin={option.origin} />
        </div>
      }
      logo={<AccountIcon address={option.address} genesisHash={option.genesisHash} />}
      fiat={<Fiat amount={option.total ?? 0} isBalance />}
      isSelected={isSelected}
      onClick={handleClick}
      right={null}
    />
  )
}

const FolderOption = ({ option }: { option: FolderAccountOption }) => {
  const [searchParams, updateSearchParams] = useSearchParams()

  const handleClick = useCallback(() => {
    searchParams.delete("account")
    searchParams.set("folder", option.id)
    updateSearchParams(searchParams, { replace: true })
  }, [option.id, searchParams, updateSearchParams])

  const isSelected = useMemo(() => {
    return searchParams.get("folder") === option.id
  }, [option.id, searchParams])

  return (
    <SidebarButtonBase
      label={option.name}
      logo={<AccountFolderIcon />}
      fiat={<Fiat amount={option.total ?? 0} isBalance />}
      isSelected={isSelected}
      onClick={handleClick}
      right={<AccountsLogoStack addresses={option.addresses} />}
    />
  )
}

const AllAccountsOption = () => {
  const { t } = useTranslation()
  const { portfolioTotal } = usePortfolioAccounts()

  const [searchParams, updateSearchParams] = useSearchParams()

  const handleClick = useCallback(() => {
    searchParams.delete("account")
    searchParams.delete("folder")
    updateSearchParams(searchParams, { replace: true })
  }, [searchParams, updateSearchParams])

  const isSelected = useMemo(() => {
    return !searchParams.get("account") && !searchParams.get("folder")
  }, [searchParams])

  return (
    <SidebarButtonBase
      label={t("All Accounts")}
      logo={<AllAccountsIcon />}
      fiat={<Fiat amount={portfolioTotal ?? 0} isBalance />}
      isSelected={isSelected}
      onClick={handleClick}
      right={null}
    />
  )
}
