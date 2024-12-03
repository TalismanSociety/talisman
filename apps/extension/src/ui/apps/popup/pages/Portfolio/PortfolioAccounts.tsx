import { isEthereumAddress } from "@polkadot/util-crypto"
import { bind } from "@react-rxjs/core"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { BehaviorSubject } from "rxjs"
import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import {
  AccountJsonAny,
  AccountsCatalogTree,
  AccountType,
  TreeFolder,
  TreeItem,
} from "@extension/core"
import { SearchInput } from "@talisman/components/SearchInput"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AllAccountsHeader } from "@ui/apps/popup/components/AllAccountsHeader"
import { NewFeaturesButton } from "@ui/apps/popup/components/NewFeaturesButton"
import { StakingBanner } from "@ui/apps/popup/components/StakingBanner"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountIconCopyAddressButton } from "@ui/domains/Account/AccountIconCopyAddressButton"
import { AccountsLogoStack } from "@ui/domains/Account/AccountsLogoStack"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { GetStarted } from "@ui/domains/Portfolio/GetStarted/GetStarted"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useBalances } from "@ui/state"

import { AuthorisedSiteToolbar } from "../../components/AuthorisedSiteToolbar"
import { useQuickSettingsOpenClose } from "../../components/Navigation/QuickSettings"

const portfolioAccountsSearch$ = new BehaviorSubject("")

const setPortfolioAccountsSearch = (search: string) => {
  portfolioAccountsSearch$.next(search)
}

const [usePortfolioAccountsSearch] = bind(portfolioAccountsSearch$)

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Portfolio Home",
}

type FolderAccountOption = {
  type: "folder"
  treeName: string
  id: string
  name: string
  total?: number
  addresses: string[]
  searchContent: string
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
  searchContent: string
}

type AccountOption = FolderAccountOption | AccountAccountOption

const FolderButton: FC<{ option: FolderAccountOption }> = ({ option }) => {
  const navigate = useNavigate()

  const handleClick = useCallback(() => {
    navigate(`/portfolio?folder=${option.id}`)
  }, [navigate, option])

  return (
    <button
      type="button"
      tabIndex={0}
      className={classNames(
        "text-body-secondary bg-black-secondary hover:bg-grey-800 flex h-[5.9rem] w-full cursor-pointer items-center gap-6 overflow-hidden rounded-sm px-6 hover:text-white",
      )}
      onClick={handleClick}
    >
      <div className="flex flex-col justify-center text-xl">
        <AccountFolderIcon />
      </div>
      <div className="flex grow flex-col items-start justify-center gap-1 overflow-hidden">
        <div className="text-body flex w-full items-center gap-3 text-base">
          <div className="truncate">{option.name}</div>
        </div>
        <div className="text-body-secondary flex w-full truncate text-left text-sm">
          <Fiat amount={option.total} isBalance />
        </div>
      </div>
      <AccountsLogoStack className="text-sm" addresses={option.addresses} />
    </button>
  )
}

const AccountButton: FC<{ option: AccountAccountOption }> = ({ option }) => {
  const navigate = useNavigate()
  const { genericEvent } = useAnalytics()

  const handleClick = useCallback(() => {
    genericEvent("select account(s)", {
      type: option.address ? (isEthereumAddress(option.address) ? "ethereum" : "substrate") : "all",
      from: "popup",
    })
    navigate(`/portfolio/tokens?account=${option.address}`)
  }, [genericEvent, navigate, option])

  return (
    <div
      className={classNames(
        "group",
        "bg-black-secondary hover:bg-grey-800 relative h-[5.9rem] w-full rounded-sm",
      )}
    >
      <button
        type="button"
        tabIndex={0}
        className={classNames(
          "text-body-secondary flex h-[5.9rem] w-full cursor-pointer items-center gap-6 overflow-hidden rounded-sm px-6 hover:text-white",
        )}
        onClick={handleClick}
      >
        <div className="flex flex-col justify-center text-xl">
          <div className="size-[3.2rem]"></div>
        </div>
        <div className="flex grow flex-col items-start justify-center gap-1 overflow-hidden">
          <div className="text-body flex w-full items-center gap-3 text-base">
            <div className="truncate">{option.name}</div>
            <AccountTypeIcon
              className="text-primary"
              origin={option.origin}
              signetUrl={option.signetUrl}
            />
          </div>
          <div className="text-body-secondary flex w-full truncate text-left text-sm">
            <Fiat amount={option.total} isBalance className="group-hover:hidden" />
            <Address
              className="hidden truncate group-hover:block"
              address={option.address}
              genesisHash={option.genesisHash}
              noTooltip
              startCharCount={6}
              endCharCount={6}
            />
          </div>
        </div>

        <div className="text-lg">
          <ChevronRightIcon />
        </div>
      </button>
      {/* Absolute positioning based on parent, to prevent a "button inside a button" situation */}
      <div className="absolute left-6 top-0 flex h-[5.9rem] flex-col justify-center">
        <div className="relative size-[3.2rem] text-xl">
          <AccountIconCopyAddressButton address={option.address} genesisHash={option.genesisHash} />
        </div>
      </div>
    </div>
  )
}

const accountTypeGuard = (option: AccountOption): option is AccountAccountOption =>
  option.type === "account"

const AccountsToolbar = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = usePortfolioAccountsSearch()

  const handleAddAccountClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add account button",
    })
    api.dashboardOpen("/accounts/add")
    window.close()
  }, [])

  const handleManageAccountsClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Manage Accounts button",
    })
    navigate("/manage-accounts")
  }, [navigate])

  useEffect(() => {
    // clear on unmount
    return () => {
      portfolioAccountsSearch$.next("")
    }
  }, [])

  const { open: openSettings } = useQuickSettingsOpenClose()

  return (
    <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
      <div className="flex grow items-center overflow-hidden">
        <SearchInput
          containerClassName={classNames(
            "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.2rem] w-full border border-field text-sm !px-4",
            "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10",
          )}
          placeholder={t("Search account or folder")}
          onChange={setPortfolioAccountsSearch}
          initialValue={search}
        />
      </div>
      <Tooltip placement="bottom">
        <TooltipTrigger asChild>
          <PortfolioToolbarButton onClick={handleAddAccountClick}>
            <PlusIcon />
          </PortfolioToolbarButton>
        </TooltipTrigger>
        <TooltipContent>{t("Add account")}</TooltipContent>
      </Tooltip>
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <PortfolioToolbarButton onClick={handleManageAccountsClick}>
            <UserIcon />
          </PortfolioToolbarButton>
        </TooltipTrigger>
        <TooltipContent>{t("Manage accounts")}</TooltipContent>
      </Tooltip>
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <PortfolioToolbarButton onClick={openSettings}>
            <SettingsIcon />
          </PortfolioToolbarButton>
        </TooltipTrigger>
        <TooltipContent>{t("Settings")}</TooltipContent>
      </Tooltip>
    </div>
  )
}

const AccountsList = ({ className, options }: { className?: string; options: AccountOption[] }) => {
  return (
    <div className={classNames("flex w-full flex-col gap-4", className)}>
      {options.map((option) =>
        option.type === "folder" ? (
          <FolderButton key={option.id} option={option} />
        ) : (
          <AccountButton key={`account-${option.address}`} option={option} />
        ),
      )}
    </div>
  )
}

const Accounts = ({
  accounts,
  folder,
  folderTotal,
  portfolioOptions,
  watchedOptions,
}: {
  accounts: AccountJsonAny[]
  folder?: TreeFolder | null
  folderTotal?: number
  portfolioOptions: AccountOption[]
  watchedOptions: AccountOption[]
}) => {
  const { t } = useTranslation()

  const hasPortfolioOptions = portfolioOptions.length > 0
  const hasWatchedOptions = watchedOptions.length > 0

  const addresses = useMemo(
    () => portfolioOptions.filter(accountTypeGuard).map(({ address }) => address),
    [portfolioOptions],
  )

  return (
    <div className="flex w-full flex-col gap-4">
      {folder ? (
        <FolderHeader folder={folder} folderTotal={folderTotal} />
      ) : (
        <>
          <AllAccountsHeader accounts={accounts} />
          <NewFeaturesButton />
          <StakingBanner addresses={addresses} />
        </>
      )}

      <AccountsToolbar />

      {hasPortfolioOptions && <AccountsList options={portfolioOptions} />}

      {hasWatchedOptions && (
        <div className={classNames("text-body-secondary flex items-center gap-2 font-bold")}>
          <EyeIcon />
          <div>{t("Followed only")}</div>
        </div>
      )}
      {hasWatchedOptions && <AccountsList options={watchedOptions} />}

      {!portfolioOptions.length && !watchedOptions.length && (
        <div className="bg-grey-900 text-body-disabled flex h-[10rem] items-center justify-center rounded-sm text-xs opacity-50">
          {t("No accounts found")}
        </div>
      )}
    </div>
  )
}

const FolderHeader = ({ folder, folderTotal }: { folder: TreeFolder; folderTotal?: number }) => {
  const navigate = useNavigate()

  return (
    <div className={"mb-6 flex w-full items-center gap-4 overflow-hidden"}>
      <IconButton onClick={() => navigate(-1)}>
        <ChevronLeftIcon />
      </IconButton>
      <div className="flex flex-col justify-center">
        <CurrentAccountAvatar className="!text-2xl" />
      </div>
      <div className="flex grow flex-col gap-1 overflow-hidden pl-2 text-sm">
        <div className="flex items-center gap-3">
          <div className="text-body-secondary truncate">{folder.name}</div>
        </div>
        <div className="truncate">
          <Fiat amount={folderTotal} isBalance />
        </div>
      </div>
    </div>
  )
}

// Rendering this component will fire balance subscription (& suspense)
const BalancesLoader = () => {
  useBalances()

  return null
}

export const PortfolioAccounts = () => {
  const { accounts, catalog, balanceTotalPerAccount } = usePortfolioAccounts()
  const { selectedFolder: folder, treeName } = usePortfolioNavigation()
  const search = usePortfolioAccountsSearch()
  const { popupOpenEvent } = useAnalytics()
  const { t } = useTranslation()

  const [allPortfolioOptions, allWatchedOptions] = useMemo((): [
    AccountOption[],
    AccountOption[],
  ] => {
    const [portfolioTree, watchedTree] = (() => {
      if (folder && treeName === "portfolio") return [folder.tree, []]
      if (folder && treeName === "watched") return [[], folder.tree]
      return [catalog.portfolio, catalog.watched]
    })()

    const treeItemToOption =
      (treeName: AccountsCatalogTree) =>
      (item: TreeItem): AccountOption => {
        const account =
          item.type === "account"
            ? accounts.find((account) => account.address === item.address)
            : undefined

        const getSearchContent = (account?: AccountJsonAny) =>
          [account?.name, account?.address, account?.origin?.replaceAll(/talisman/gi, "")]
            .join(" ")
            .toLowerCase()

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
              searchContent: getSearchContent(account),
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
              searchContent: item.tree
                .map((item) => {
                  const account = accounts.find((account) => account.address === item.address)
                  return getSearchContent(account)
                })
                .concat(item.name.toLowerCase())
                .join(" "),
            }
      }

    return [
      portfolioTree.map(treeItemToOption("portfolio")),
      watchedTree.map(treeItemToOption("watched")),
    ]
  }, [folder, treeName, catalog.portfolio, catalog.watched, accounts, t, balanceTotalPerAccount])

  const ls = useMemo(() => search.toLowerCase(), [search])

  const searchFilter = useCallback(
    (option: AccountOption): boolean => {
      return !search || option.searchContent.includes(ls)
    },
    [ls, search],
  )

  const [portfolioOptions, watchedOptions] = useMemo(
    () => [allPortfolioOptions.filter(searchFilter), allWatchedOptions.filter(searchFilter)],
    [allPortfolioOptions, allWatchedOptions, searchFilter],
  )

  const folderTotal = useMemo(
    () =>
      folder
        ? folder.tree.reduce(
            (sum, account) => sum + (balanceTotalPerAccount[account.address] ?? 0),
            0,
          )
        : undefined,
    [balanceTotalPerAccount, folder],
  )

  useEffect(() => {
    popupOpenEvent("portfolio accounts")
  }, [popupOpenEvent])

  const [fetchBalances, setFetchBalances] = useState(false)
  useEffect(() => {
    // start fetching balances 100ms after first render
    const timeout = setTimeout(() => {
      setFetchBalances(true)
    }, 100)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <>
      {!folder && <AuthorisedSiteToolbar />}
      <Accounts
        accounts={accounts}
        folder={folder}
        folderTotal={folderTotal}
        portfolioOptions={portfolioOptions}
        watchedOptions={watchedOptions}
      />
      {!search && <GetStarted />}
      {fetchBalances && (
        <Suspense fallback={<SuspenseTracker name="BalancesLoader" />}>
          <BalancesLoader />
        </Suspense>
      )}
    </>
  )
}
