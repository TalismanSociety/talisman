import { TreeFolder, TreeItem } from "@core/domains/accounts/store.catalog"
import { AccountType, AccountsCatalogTree } from "@core/domains/accounts/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { FadeIn } from "@talisman/components/FadeIn"
import { IconButton } from "@talisman/components/IconButton"
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, EyeIcon } from "@talisman/theme/icons"
import { Balance, Balances } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AccountsLogoStack } from "@ui/apps/dashboard/routes/Settings/Accounts/AccountsLogoStack"
import { TotalFiatBalance } from "@ui/apps/popup/components/TotalFiatBalance"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import useAccounts from "@ui/hooks/useAccounts"
import useAccountsCatalog from "@ui/hooks/useAccountsCatalog"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"
import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { MYSTICAL_PHYSICS_V3, MysticalBackground } from "talisman-ui"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Porfolio",
  featureVersion: 2,
  page: "Portfolio Home",
}

type AccountOption =
  | {
      type: "folder"
      treeName: string
      name: string
      color: string
      total?: number
      addresses: string[]
    }
  | {
      type: "account"
      name: string
      address: string
      total?: number
      genesisHash?: string | null
      origin?: AccountType
      isPortfolio?: boolean
    }

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
        `/portfolio?${option.treeName === "portfolio" ? "folder" : "watchedFolder"}=${option.name}`
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

  return (
    <button
      type="button"
      tabIndex={0}
      className="text-body-secondary bg-black-secondary hover:bg-grey-800 flex h-[5.9rem] w-full cursor-pointer items-center gap-6 overflow-hidden rounded-sm px-6 hover:text-white"
      onClick={handleClick}
    >
      <div className="flex flex-col justify-center text-xl">
        {option.type === "account" ? (
          <AccountAvatar address={option.address} genesisHash={option.genesisHash} />
        ) : (
          <AccountFolderIcon color={option.color} />
        )}
      </div>
      <div className="flex grow flex-col items-start justify-center gap-2 overflow-hidden">
        <div className="text-body flex w-full items-center gap-3 text-base leading-none">
          <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">{option.name}</div>
          {option.type === "account" ? (
            <>
              <AccountTypeIcon className="text-primary" origin={option.origin} />
              <div className="flex flex-col justify-end">
                <CopyIcon
                  role="button"
                  className="text-body-secondary hover:text-body !text-sm "
                  onClick={handleCopyClick}
                />
              </div>
            </>
          ) : null}
        </div>
        <div className="text-body-secondary flex w-full overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm leading-none">
          <Fiat amount={option.total} isBalance />
        </div>
      </div>
      <div className="flex flex-col justify-center text-lg">
        {option.type === "account" ? (
          <ChevronRightIcon />
        ) : (
          <AccountsLogoStack className="text-sm" addresses={option.addresses} />
        )}
      </div>
    </button>
  )
}

const AccountsList = ({ className, options }: { className?: string; options: AccountOption[] }) => (
  <div className={classNames("flex w-full flex-col gap-4", className)}>
    {options.map((option) => (
      <AccountButton
        key={`${option.type}-${option.type === "account" ? option.address : option.name}`}
        option={option}
      />
    ))}
  </div>
)

const AccountsBgConfig = {
  ...MYSTICAL_PHYSICS_V3,
  withAcolyte: false,
  artifacts: 10,
  blur: 0,
  radiusMin: 2,
  radiusMax: 4,
}
const Accounts = ({
  folder,
  folderTotal,
  portfolioOptions,
  watchedOptions,
}: {
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
      {!folder && <AllAccountsHeader />}
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

const AllAccountsHeader = () => {
  const navigate = useNavigate()
  const handleClick = useCallback(() => navigate("/portfolio/assets"), [navigate])
  const [mouseOver, setMouseOver] = useState(false)

  return (
    <button
      className="hover:bg-grey-800 relative flex w-full cursor-pointer flex-col items-start gap-4 overflow-hidden rounded-sm p-6 hover:text-white"
      onClick={handleClick}
      onMouseOver={() => setMouseOver(true)}
      onFocus={() => setMouseOver(true)}
      onMouseOut={() => setMouseOver(false)}
      onBlur={() => setMouseOver(false)}
    >
      <MysticalBackground
        className="absolute left-0 top-0 h-full w-full backdrop-blur-3xl"
        config={AccountsBgConfig}
      />
      <TotalFiatBalance className="relative" mouseOver={mouseOver} />
    </button>
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
      <div className="flex grow flex-col gap-2 overflow-hidden pl-2 text-sm">
        <div className="flex items-center gap-3">
          <div className="text-body-secondary overflow-hidden text-ellipsis whitespace-nowrap">
            {folder.name}
          </div>
        </div>
        <div className="text-md overflow-hidden text-ellipsis whitespace-nowrap">
          <Fiat amount={folderTotal} isBalance />
        </div>
      </div>
    </div>
  )
}

export const PortfolioAccounts = () => {
  const balances = useBalances()
  const accounts = useAccounts()
  const catalog = useAccountsCatalog()
  const { folder, treeName: folderTreeName } = useSearchParamsSelectedFolder()
  const { popupOpenEvent } = useAnalytics()
  const { t } = useTranslation()

  const balancesByAddress = useMemo(() => {
    // we use this to avoid looping over the balances list n times, where n is the number of accounts in the wallet
    // instead, we'll only interate over the balances one time
    const balancesByAddress: Map<string, Balance[]> = new Map()
    balances.each.forEach((balance) => {
      if (!balancesByAddress.has(balance.address)) balancesByAddress.set(balance.address, [])
      balancesByAddress.get(balance.address)?.push(balance)
    })
    return balancesByAddress
  }, [balances])

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
              total: new Balances(balancesByAddress.get(item.address) ?? []).sum.fiat("usd").total,
              genesisHash: account?.genesisHash,
              origin: account?.origin,
              isPortfolio: !!account?.isPortfolio,
            }
          : {
              type: "folder",
              treeName,
              name: item.name,
              color: item.color,
              total: new Balances(
                item.tree.flatMap((account) => balancesByAddress.get(account.address) ?? [])
              ).sum.fiat("usd").total,
              addresses: item.tree.map((account) => account.address),
            }
      }

    return [
      portfolioTree.map(treeItemToOption("portfolio")),
      watchedTree.map(treeItemToOption("watched")),
    ]
  }, [folder, folderTreeName, catalog, accounts, t, balancesByAddress])

  const folderTotal = useMemo(
    () =>
      folder
        ? new Balances(
            folder.tree.flatMap((account) => balancesByAddress.get(account.address) ?? [])
          ).sum.fiat("usd").total
        : undefined,
    [balancesByAddress, folder]
  )

  useEffect(() => {
    popupOpenEvent("portfolio accounts")
  }, [popupOpenEvent])

  // if only 1 entry (all accounts) it means that accounts aren't loaded
  if ([...portfolioOptions, ...watchedOptions].length <= 1) return null

  return (
    <FadeIn>
      <Accounts
        folder={folder}
        folderTotal={folderTotal}
        portfolioOptions={portfolioOptions}
        watchedOptions={watchedOptions}
      />
    </FadeIn>
  )
}
