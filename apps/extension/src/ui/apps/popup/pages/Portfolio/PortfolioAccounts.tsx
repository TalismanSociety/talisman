import { isEthereumAddress } from "@polkadot/util-crypto"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { atom, useAtom, useAtomValue } from "jotai"
import { FC, MouseEventHandler, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
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
import { NoAccountsPopup } from "@ui/apps/popup/pages/Portfolio/shared/NoAccounts"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountsLogoStack } from "@ui/domains/Account/AccountsLogoStack"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalances } from "@ui/hooks/useBalances"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"

import { AuthorisedSiteToolbar } from "../../components/AuthorisedSiteToolbar"
import { useQuickSettingsOpenClose } from "../../components/Navigation/QuickSettings"

const portfolioAccountsSearchAtom = atom("")

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

const FormattedAddress: FC<{
  address: string
  genesisHash?: string | null
  className?: string
}> = ({ address, genesisHash, className }) => {
  const formattedAddress = useFormattedAddress(address, genesisHash)

  return <Address className={className} address={formattedAddress} />
}

const CopyAddressButton: FC<{ option: AccountOption }> = ({ option }) => {
  const { open } = useCopyAddressModal()

  const chain = useChainByGenesisHash(option.type === "account" ? option.genesisHash : null)

  const handleCopyClick: MouseEventHandler<HTMLOrSVGElement> = useCallback(
    (event) => {
      event.stopPropagation()
      if (option.type === "account") {
        sendAnalyticsEvent({
          ...ANALYTICS_PAGE,
          name: "Goto",
          action: "open copy address",
        })
        open({
          address: option.address,
          networkId: chain?.id,
        })
      }
    },
    [open, option, chain?.id]
  )

  return (
    <CopyIcon
      role="button"
      className="text-body-secondary hover:text-body !text-sm "
      onClick={handleCopyClick}
    />
  )
}

const AccountButton = ({ option }: { option: AccountOption }) => {
  const navigate = useNavigate()
  const { genericEvent } = useAnalytics()

  const handleClick = useCallback(() => {
    if (option.type === "account") {
      genericEvent("select account(s)", {
        type: option.address
          ? isEthereumAddress(option.address)
            ? "ethereum"
            : "substrate"
          : "all",
        from: "popup",
      })
      return navigate(`/portfolio/tokens?account=${option.address}`)
    }

    // navigate to list of accounts in folder (user clicked folder on main menu)
    if (option.type === "folder")
      return navigate(
        `/portfolio?${option.treeName === "portfolio" ? "folder" : "watchedFolder"}=${option.id}`
      )
  }, [genericEvent, navigate, option])

  const isAccount = option.type === "account"

  return (
    <button
      type="button"
      tabIndex={0}
      className={classNames(
        "[&:hover_.hide-on-hover]:hidden [&:hover_.show-on-hover]:block [&_.hide-on-hover]:block [&_.show-on-hover]:hidden",
        "text-body-secondary bg-black-secondary hover:bg-grey-800 flex h-[5.9rem] w-full cursor-pointer items-center gap-6 overflow-hidden rounded-sm px-6 hover:text-white"
      )}
      onClick={handleClick}
    >
      <div className="flex flex-col justify-center text-xl">
        {isAccount ? (
          <AccountIcon address={option.address} genesisHash={option.genesisHash} />
        ) : (
          <AccountFolderIcon />
        )}
      </div>
      <div className="flex grow flex-col items-start justify-center gap-1 overflow-hidden">
        <div className="text-body flex w-full items-center gap-3 text-base">
          <div className="truncate">{option.name}</div>
          {isAccount && (
            <AccountTypeIcon
              className="text-primary"
              origin={option.origin}
              signetUrl={option.signetUrl}
            />
          )}
          {isAccount && (
            <div className="show-on-hover flex flex-col justify-end">
              <Suspense>
                <CopyAddressButton option={option} />
              </Suspense>
            </div>
          )}
        </div>
        <div className="text-body-secondary flex w-full truncate text-left text-sm">
          <Fiat amount={option.total} isBalance />
        </div>
      </div>
      {isAccount && (
        <Suspense>
          <FormattedAddress
            address={option.address}
            genesisHash={option.genesisHash}
            className="show-on-hover text-body-secondary text-xs"
          />
        </Suspense>
      )}
      {isAccount && (
        <div className="hide-on-hover text-lg">
          <ChevronRightIcon />
        </div>
      )}
      {!isAccount && <AccountsLogoStack className="text-sm" addresses={option.addresses} />}
    </button>
  )
}

const accountTypeGuard = (option: AccountOption): option is AccountAccountOption =>
  option.type === "account"

const AccountsToolbar = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useAtom(portfolioAccountsSearchAtom)

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
      setSearch("")
    }
  }, [setSearch])

  const { open: openSettings } = useQuickSettingsOpenClose()

  return (
    <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
      <div className="flex grow items-center overflow-hidden">
        <SearchInput
          containerClassName={classNames(
            "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] w-full border border-field text-sm !px-4",
            "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10"
          )}
          placeholder={t("Search account or folder")}
          onChange={setSearch}
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
      {options.map((option) => (
        <AccountButton
          key={option.type === "account" ? `account-${option.address}` : option.id}
          option={option}
        />
      ))}
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
  folder?: TreeFolder
  folderTotal?: number
  portfolioOptions: AccountOption[]
  watchedOptions: AccountOption[]
}) => {
  const { t } = useTranslation()

  const hasPortfolioOptions = portfolioOptions.length > 0
  const hasWatchedOptions = watchedOptions.length > 0

  const addresses = useMemo(
    () => portfolioOptions.filter(accountTypeGuard).map(({ address }) => address),
    [portfolioOptions]
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
        <div className="text-md truncate">
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
  const { accounts, ownedAccounts, catalog, balanceTotalPerAccount, ownedTotal } =
    usePortfolioAccounts()
  const { folder, treeName: folderTreeName } = useSearchParamsSelectedFolder()
  const search = useAtomValue(portfolioAccountsSearchAtom)
  const { popupOpenEvent } = useAnalytics()
  const { t } = useTranslation()

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
                0
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
  }, [
    folder,
    folderTreeName,
    catalog.portfolio,
    catalog.watched,
    accounts,
    t,
    balanceTotalPerAccount,
  ])

  const ls = useMemo(() => search.toLowerCase(), [search])

  const searchFilter = useCallback(
    (option: AccountOption): boolean => {
      return !search || option.searchContent.includes(ls)
    },
    [ls, search]
  )

  const [portfolioOptions, watchedOptions] = useMemo(
    () => [allPortfolioOptions.filter(searchFilter), allWatchedOptions.filter(searchFilter)],
    [allPortfolioOptions, allWatchedOptions, searchFilter]
  )

  const folderTotal = useMemo(
    () =>
      folder
        ? folder.tree.reduce(
            (sum, account) => sum + (balanceTotalPerAccount[account.address] ?? 0),
            0
          )
        : undefined,
    [balanceTotalPerAccount, folder]
  )

  const showGetStartedPopup = !ownedTotal && ownedAccounts.length <= 2

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
      <div className="flex w-full flex-col gap-12">
        <Accounts
          accounts={accounts}
          folder={folder}
          folderTotal={folderTotal}
          portfolioOptions={portfolioOptions}
          watchedOptions={watchedOptions}
        />
        {showGetStartedPopup && <NoAccountsPopup accounts={accounts} />}
      </div>
      {fetchBalances && (
        <Suspense fallback={<SuspenseTracker name="BalancesLoader" />}>
          <BalancesLoader />
        </Suspense>
      )}
    </>
  )
}
