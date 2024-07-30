import { isEthereumAddress } from "@polkadot/util-crypto"
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, EyeIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, MouseEventHandler, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import {
  AccountJsonAny,
  AccountsCatalogTree,
  AccountType,
  TreeFolder,
  TreeItem,
} from "@extension/core"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AccountsLogoStack } from "@ui/apps/dashboard/routes/Settings/Accounts/AccountsLogoStack"
import { AllAccountsHeader } from "@ui/apps/popup/components/AllAccountsHeader"
import { NewFeaturesButton } from "@ui/apps/popup/components/NewFeaturesButton"
import { StakingBanner } from "@ui/apps/popup/components/StakingBanner"
import { NoAccountsPopup } from "@ui/apps/popup/pages/NoAccounts"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalances } from "@ui/hooks/useBalances"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"

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
      <div className="flex grow flex-col items-start justify-center gap-2 overflow-hidden">
        <div className="text-body flex w-full items-center gap-3 text-base leading-none">
          <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">{option.name}</div>
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
        <div className="text-body-secondary flex w-full truncate text-left text-sm leading-none">
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

const AccountsList = ({ className, options }: { className?: string; options: AccountOption[] }) => {
  const addresses = useMemo(
    () => options.filter(accountTypeGuard).map(({ address }) => address),
    [options]
  )

  return (
    <div className={classNames("flex w-full flex-col gap-4", className)}>
      <StakingBanner addresses={addresses} />
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

  return (
    <div className="flex w-full flex-col gap-4">
      {!folder && <AllAccountsHeader accounts={accounts} />}
      {!folder && <NewFeaturesButton />}
      {folder && <FolderHeader folder={folder} folderTotal={folderTotal} />}

      {hasPortfolioOptions && (
        <AccountsList className={folder && "mt-6"} options={portfolioOptions} />
      )}

      {hasWatchedOptions && (
        <div
          className={classNames(
            "text-body-secondary flex items-center gap-2 font-bold",
            (folder || hasPortfolioOptions) && "mt-6"
          )}
        >
          <EyeIcon />
          <div>{t("Followed only")}</div>
        </div>
      )}
      {hasWatchedOptions && <AccountsList options={watchedOptions} />}
    </div>
  )
}

const FolderHeader = ({ folder, folderTotal }: { folder: TreeFolder; folderTotal?: number }) => {
  const navigate = useNavigate()

  return (
    <div className={"flex w-full items-center gap-4 overflow-hidden"}>
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
  const { popupOpenEvent } = useAnalytics()
  const { t } = useTranslation()

  const [portfolioOptions, watchedOptions] = useMemo((): [AccountOption[], AccountOption[]] => {
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
      <div className="flex flex-col gap-12 pb-12">
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
