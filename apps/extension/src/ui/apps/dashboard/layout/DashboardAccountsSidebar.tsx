import { CheckIcon, EyeIcon, PlusIcon, UserIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountsCatalogTree, AccountType, TreeItem } from "extension-core"
import { FC, Fragment, ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountIconCopyAddressButton } from "@ui/domains/Account/AccountIconCopyAddressButton"
import { AccountsLogoStack } from "@ui/domains/Account/AccountsLogoStack"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"

export const DashboardAccountsSidebar: FC = () => {
  return (
    <div className="bg-grey-900 rounded-lg">
      <Accounts />
    </div>
  )
}

const Accounts = () => {
  const { t } = useTranslation()

  const { currentFolder, treeName } = usePortfolioNavigation()
  const { accounts, catalog, balanceTotalPerAccount } = usePortfolioAccounts()

  const [allPortfolioOptions, allWatchedOptions] = useMemo((): [
    AccountOption[],
    AccountOption[],
  ] => {
    const [portfolioTree, watchedTree] = (() => {
      if (currentFolder && treeName === "portfolio")
        return [[currentFolder, ...currentFolder.tree], []]
      if (currentFolder && treeName === "watched")
        return [[], [currentFolder, ...currentFolder.tree]]
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
                0,
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
    currentFolder,
    treeName,
    catalog.portfolio,
    catalog.watched,
    accounts,
    t,
    balanceTotalPerAccount,
  ])

  const { genericEvent } = useAnalytics()
  const navigate = useNavigate()

  const handleManageAccountsClick = useCallback(() => {
    genericEvent("goto manage accounts", { from: "sidebar" })
    navigate("/settings/accounts")
  }, [genericEvent, navigate])

  const handleAddAccountClick = useCallback(() => {
    genericEvent("goto add account", { from: "sidebar" })
    navigate("/accounts/add")
  }, [genericEvent, navigate])

  return (
    <div className="flex w-full flex-col gap-8 p-8">
      <div className="flex h-16 shrink-0 items-center">
        <div className="grow pl-4 text-[2rem] font-bold">{t("Accounts")}</div>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton onClick={handleManageAccountsClick} className="p-3">
              <UserIcon className="size-10" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent>{t("Manage Accounts")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton onClick={handleAddAccountClick} className="p-3">
              <PlusIcon className="size-10" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent>{t("Add Account")}</TooltipContent>
        </Tooltip>
      </div>
      <div className="bg-grey-800 h-0.5"></div>
      <TreeAccounts options={allPortfolioOptions} showAllAccounts />
      {!!allWatchedOptions.length && (
        <>
          {!!allPortfolioOptions.length && <div className="bg-grey-800 h-0.5"></div>}
          <div className="flex items-center gap-4">
            <EyeIcon />
            <div className="text-sm">{t("Followed only")}</div>
          </div>
          <TreeAccounts options={allWatchedOptions} />
        </>
      )}
    </div>
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

const TreeAccounts: FC<{
  options: AccountOption[]
  showAllAccounts?: boolean
}> = ({ options, showAllAccounts }) => {
  return (
    <div className="flex w-full flex-col gap-2">
      {showAllAccounts && <AllAccountsOption />}
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
    <div className="hover:bg-grey-750 group relative w-full rounded-[12px]">
      <SidebarButtonBase
        label={
          <div className="flex w-full items-center gap-2">
            <div className="truncate">{option.name ?? shortenAddress(option.address)}</div>
            <AccountTypeIcon className="text-primary shrink-0" origin={option.origin} />
          </div>
        }
        logo={<div className="size-20 shrink-0"></div>}
        fiat={
          <>
            <Fiat
              className="h-8 group-hover:hidden"
              amount={option.total ?? 0}
              isBalance
              noCountUp
            />
            <Address
              className="hidden group-hover:block"
              address={option.address}
              genesisHash={option.genesisHash}
              noTooltip
              startCharCount={6}
              endCharCount={6}
            />
          </>
        }
        isSelected={isSelected}
        onClick={handleClick}
        right={null}
      />

      {/* Absolute positioning based on parent, to prevent a "button inside a button" situation*/}
      <AccountIconCopyAddressButton
        address={option.address}
        genesisHash={option.genesisHash}
        className="absolute left-4 top-4 text-[4rem]"
        tooltipPlacement="bottom"
      />
    </div>
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
      fiat={<Fiat amount={option.total ?? 0} isBalance noCountUp />}
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
      fiat={<Fiat amount={portfolioTotal ?? 0} isBalance noCountUp />}
      isSelected={isSelected}
      onClick={handleClick}
      right={null}
    />
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
        "hover:bg-grey-750 flex h-28 w-full items-center gap-4 rounded-[12px] px-4 text-left",
        isSelected && "bg-grey-800",
      )}
      onClick={onClick}
    >
      <div className="size-20 text-[4rem]">{logo}</div>
      <div className="flex grow flex-col justify-center gap-1 overflow-hidden">
        <div className="text-grey-300 truncate">{label}</div>
        <div className="text-grey-500 truncate text-xs">{fiat}</div>
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
