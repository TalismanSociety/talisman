import { db } from "@core/db"
import { AccountsCatalogTree, TreeFolder, TreeItem } from "@core/domains/accounts/helpers.catalog"
import { AccountJsonAny, AccountType } from "@core/domains/accounts/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, EyeIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AccountsLogoStack } from "@ui/apps/dashboard/routes/Settings/Accounts/AccountsLogoStack"
import { TotalFiatBalance } from "@ui/apps/popup/components/TotalFiatBalance"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import { useAccountColors } from "@ui/hooks/useFirstAccountColors"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"
import { useLiveQuery } from "dexie-react-hooks"
import { FC, MouseEventHandler, Suspense, useCallback, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useHoverDirty } from "react-use"
import { IconButton, MYSTICAL_PHYSICS_V3, MysticalBackground, MysticalPhysicsV3 } from "talisman-ui"

import { StakingBanner } from "../../components/StakingBanner"

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
}

type AccountOption = FolderAccountOption | AccountAccountOption

const AccountButton = ({ option }: { option: AccountOption }) => {
  const { open } = useCopyAddressModal()
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
      return navigate(`/portfolio/assets?account=${option.address}`)
    }

    // navigate to list of accounts in folder (user clicked folder on main menu)
    if (option.type === "folder")
      return navigate(
        `/portfolio?${option.treeName === "portfolio" ? "folder" : "watchedFolder"}=${option.id}`
      )
  }, [genericEvent, navigate, option])

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
          mode: "copy",
          address: option.address,
        })
      }
    },
    [open, option]
  )

  const isAccount = option.type === "account"
  const formattedAddress = isAccount ? option.address : undefined
  // const formattedAddress =  useFormattedAddress(
  //   isAccount ? option.address : undefined,
  //   isAccount ? option.genesisHash : undefined
  // )

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
          {isAccount && <AccountTypeIcon className="text-primary" origin={option.origin} />}
          {isAccount && (
            <div className="show-on-hover flex flex-col justify-end">
              <CopyIcon
                role="button"
                className="text-body-secondary hover:text-body !text-sm "
                onClick={handleCopyClick}
              />
            </div>
          )}
        </div>
        <div className="text-body-secondary flex w-full truncate text-left text-sm leading-none">
          <Suspense fallback={<SuspenseTracker name="Fiat" />}>
            <Fiat amount={option.total} isBalance />
          </Suspense>
        </div>
      </div>
      {isAccount && (
        <Suspense fallback={<SuspenseTracker name="Address" />}>
          <Address
            className="show-on-hover text-body-secondary text-xs"
            address={formattedAddress}
          />
        </Suspense>
      )}
      {isAccount && (
        <div className="hide-on-hover text-lg">
          <ChevronRightIcon />
        </div>
      )}
      {!isAccount && (
        <Suspense fallback={<SuspenseTracker name="AccountLogoStack" />}>
          <AccountsLogoStack className="text-sm" addresses={option.addresses} />
        </Suspense>
      )}
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

const BG_CONFIG: MysticalPhysicsV3 = {
  ...MYSTICAL_PHYSICS_V3,
  artifacts: 2,
  radiusMin: 4,
  radiusMax: 4,
  opacityMin: 0.5,
  opacityMax: 0.5,
  durationMin: 12000,
  durationMax: 15000,
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
    <div className="flex w-full flex-col gap-4 pb-12">
      {!folder && <AllAccountsHeader accounts={accounts} />}
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

const AllAccountsHeaderBackground: FC<{ accounts: AccountJsonAny[] }> = ({ accounts }) => {
  const colors = useAccountColors(accounts?.[0]?.address)
  const config = useMemo(() => ({ ...BG_CONFIG, colors }), [colors])

  return (
    <MysticalBackground
      className="absolute left-0 top-0 h-full w-full rounded-sm"
      config={config}
    />
  )
}

const AllAccountsHeader: FC<{ accounts: AccountJsonAny[] }> = ({ accounts }) => {
  const navigate = useNavigate()
  const handleClick = useCallback(() => navigate("/portfolio/assets"), [navigate])
  const ref = useRef<HTMLDivElement>(null)
  const isHovered = useHoverDirty(ref)

  return (
    <div ref={ref} className="relative h-[11.4rem] w-full">
      <button
        type="button"
        className={classNames(
          "flex h-full w-full items-center justify-end gap-4 overflow-hidden rounded-sm p-6 text-lg",
          "hover:bg-grey-800 bg-black-secondary text-body-secondary transition-colors duration-75 hover:text-white"
        )}
        onClick={handleClick}
        disabled={!accounts.length}
      >
        <Suspense fallback={<SuspenseTracker name="AllAccountsHeaderBackground" />}>
          <AllAccountsHeaderBackground accounts={accounts} />
        </Suspense>
        {!!accounts.length && <ChevronRightIcon className="z-10" />}
      </button>
      <Suspense fallback={<SuspenseTracker name="TotalFiatBalance" />}>
        <TotalFiatBalance
          className="pointer-events-none absolute left-0 top-0 h-full w-full px-6"
          mouseOver={isHovered}
        />
      </Suspense>
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

// Rendering this component will fire balance subscription and trigger suspense on the main wallet atom
const BalancesLoader = () => {
  useBalances()

  return null
}

const PortfolioAccountsInner: FC<{ suspense: boolean }> = ({ suspense }) => {
  const { accounts, catalog, currency } = usePortfolioAccounts()
  const { folder, treeName: folderTreeName } = useSearchParamsSelectedFolder()
  const { popupOpenEvent } = useAnalytics()
  const { t } = useTranslation()
  const balanceTotals = useLiveQuery(() => db.balanceTotals.toArray(), [])

  const balanceByAddress = useMemo(() => {
    const totals = balanceTotals ?? []
    const sumPerAddress = Object.fromEntries(
      totals.filter((t) => t.currency === currency).map((t) => [t.address, t.sum])
    )
    return Object.fromEntries(accounts.map((a) => [a.address, sumPerAddress[a.address] ?? 0]))
  }, [accounts, balanceTotals, currency])

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
              total: balanceByAddress?.[item.address] ?? 0,
              genesisHash: account?.genesisHash,
              origin: account?.origin,
              isPortfolio: !!account?.isPortfolio,
            }
          : {
              type: "folder",
              treeName,
              id: item.id,
              name: item.name,
              total: item.tree.reduce(
                (sum, account) => sum + (balanceByAddress[account.address] ?? 0),
                0
              ),
              addresses: item.tree.map((account) => account.address),
            }
      }

    return [
      portfolioTree.map(treeItemToOption("portfolio")),
      watchedTree.map(treeItemToOption("watched")),
    ]
  }, [folder, folderTreeName, catalog.portfolio, catalog.watched, accounts, t, balanceByAddress])

  const folderTotal = useMemo(
    () =>
      folder
        ? folder.tree.reduce((sum, account) => sum + (balanceByAddress[account.address] ?? 0), 0)
        : undefined,
    [balanceByAddress, folder]
  )

  useEffect(() => {
    popupOpenEvent("portfolio accounts")
  }, [popupOpenEvent])

  // console.log("rendered", suspense)

  return (
    <>
      <Accounts
        accounts={accounts}
        folder={folder}
        folderTotal={folderTotal}
        portfolioOptions={portfolioOptions}
        watchedOptions={watchedOptions}
      />
      {suspense && <BalancesLoader />}
    </>
  )
}

export const PortfolioAccounts = () => {
  return (
    <Suspense
      fallback={
        <>
          <SuspenseTracker name="PortfolioAccounts" />
          <PortfolioAccountsInner suspense={false} />
        </>
      }
    >
      <PortfolioAccountsInner suspense={true} />
    </Suspense>
  )
}
