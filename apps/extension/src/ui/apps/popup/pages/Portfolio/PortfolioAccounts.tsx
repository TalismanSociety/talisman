import { AccountType } from "@core/domains/accounts/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { FadeIn } from "@talisman/components/FadeIn"
import {
  ArrowDownIcon,
  ChevronRightIcon,
  CopyIcon,
  CreditCardIcon,
  EyeIcon,
  PaperPlaneIcon,
  TalismanHandIcon,
} from "@talisman/theme/icons"
import { Balance, Balances } from "@talismn/balances"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { TotalFiatBalance } from "@ui/apps/popup/components/TotalFiatBalance"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import AccountAvatar from "@ui/domains/Account/Avatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import useAccounts from "@ui/hooks/useAccounts"
import useAccountsCatalog from "@ui/hooks/useAccountsCatalog"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"
import { MouseEventHandler, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { PillButton } from "talisman-ui"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Porfolio",
  featureVersion: 2,
  page: "Portfolio Home",
}

type AccountOption =
  | { type: "all accounts"; name: string; total?: number }
  | { type: "folder"; name: string; color: string; total?: number }
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

  const { folder } = useSearchParamsSelectedFolder()

  const handleClick = useCallback(() => {
    if (option.type === "all accounts") {
      // navigate to list of all account assets (user clicked 'All Accounts' on main menu)
      if (!folder) return navigate("/portfolio/assets")

      // navigate to list of all account assets in folder (user clicked 'All Accounts in {{folder}}' on folder menu)
      return navigate(`/portfolio/assets?folder=${folder.name}`)
    }

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
    if (option.type === "folder") return navigate(`/portfolio?folder=${option.name}`)
  }, [folder, genericEvent, navigate, option])

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
        {option.type === "all accounts" ? (
          !folder ? (
            <AllAccountsIcon />
          ) : (
            <AccountFolderIcon color={folder.color} />
          )
        ) : option.type === "account" ? (
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
        <ChevronRightIcon />
      </div>
    </button>
  )
}

const TopActions = () => {
  const handleSendFundsClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Send Funds button",
    })
    await api.sendFundsOpen()
    window.close()
  }, [])

  const canBuy = useIsFeatureEnabled("BUY_CRYPTO")
  const handleBuyTokensClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Buy Crypto button",
    })
    await api.modalOpen({ modalType: "buy" })
    window.close()
  }, [])

  const { open: openCopyAddressModal } = useCopyAddressModal()
  const handleReceiveClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "open receive",
    })
    openCopyAddressModal({
      mode: "receive",
    })
  }, [openCopyAddressModal])

  const { t } = useTranslation()

  return (
    <div className="mt-8 flex justify-center gap-4">
      <>
        <PillButton onClick={handleReceiveClick} icon={ArrowDownIcon}>
          {t("Receive")}
        </PillButton>
        <PillButton onClick={handleSendFundsClick} icon={PaperPlaneIcon}>
          {t("Send")}
        </PillButton>
        {canBuy && (
          <PillButton onClick={handleBuyTokensClick} icon={CreditCardIcon}>
            {t("Buy")}
          </PillButton>
        )}
      </>
    </div>
  )
}

const AccountsListView = ({ options }: { options: AccountOption[] }) => (
  <div className="flex w-full flex-col gap-4 ">
    {options.map((option) => (
      <AccountButton
        key={`${option.type}-${
          option.type === "all accounts"
            ? "all"
            : option.type === "account"
            ? option.address
            : option.name
        }`}
        option={option}
      />
    ))}
  </div>
)

const AccountsList = ({ options }: { options: AccountOption[] }) => {
  const { t } = useTranslation()
  const { myAccounts, watchedAccounts } = useMemo(
    () => ({
      // TODO: Split watched accounts into separate tree
      myAccounts: options,
      watchedAccounts: [],
      // myAccounts: options.filter(({ origin, isPortfolio }) => origin !== "WATCHED" || isPortfolio),
      // watchedAccounts: options.filter(
      //   ({ origin, isPortfolio }) => origin === "WATCHED" && !isPortfolio
      // ),
    }),
    [options]
  )

  if (watchedAccounts.length && myAccounts.length)
    return (
      <div className="py-12">
        <div className="text-body-secondary mb-6 flex items-center gap-4 font-bold">
          <TalismanHandIcon className="inline" />
          <div>{t("My portfolio")}</div>
        </div>
        <AccountsListView options={myAccounts} />
        <div className="text-body-secondary mb-6 mt-8 flex items-center gap-4 font-bold">
          <EyeIcon className="inline " />
          <div>{t("Followed only")}</div>
        </div>
        <AccountsListView options={watchedAccounts} />
      </div>
    )

  return (
    <div className="py-12">
      <AccountsListView options={options} />
    </div>
  )
}

const Accounts = ({ options }: { options: AccountOption[] }) => (
  <div className="flex w-full flex-col">
    <TotalFiatBalance />
    <TopActions />
    <AccountsList options={options} />
  </div>
)

export const PortfolioAccounts = () => {
  const balances = useBalances()
  const myBalances = useBalances("portfolio")
  const accounts = useAccounts()
  const catalog = useAccountsCatalog()
  const { folder } = useSearchParamsSelectedFolder()
  const { popupOpenEvent } = useAnalytics()
  const { t } = useTranslation()

  const options = useMemo((): AccountOption[] => {
    // we use this to avoid looping over the balances list n times, where n is the number of accounts in the wallet
    // instead, we'll only interate over the balances one time
    const balancesByAddress: Map<string, Balance[]> = new Map()
    balances.each.forEach((balance) => {
      if (!balancesByAddress.has(balance.address)) balancesByAddress.set(balance.address, [])
      balancesByAddress.get(balance.address)?.push(balance)
    })

    const allAccountsName = !folder
      ? t("All Accounts")
      : t("All Accounts in '{{folder}}'", { folder: folder.name })
    const allAccountsTotal = !folder
      ? myBalances.sum.fiat("usd").total
      : new Balances(
          folder.tree.flatMap((account) => balancesByAddress.get(account.address) ?? [])
        ).sum.fiat("usd").total
    const tree = folder ? folder.tree : catalog

    return [
      {
        type: "all accounts",
        name: allAccountsName,
        total: allAccountsTotal,
      },
      ...tree.map((item): AccountOption => {
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
              name: item.name,
              color: item.color,
              total: new Balances(
                item.tree.flatMap((account) => balancesByAddress.get(account.address) ?? [])
              ).sum.fiat("usd").total,
            }
      }),
    ]
  }, [balances, folder, catalog, t, myBalances, accounts])

  useEffect(() => {
    popupOpenEvent("portfolio accounts")
  }, [popupOpenEvent])

  // if only 1 entry (all accounts) it means that accounts aren't loaded
  if (options.length <= 1) return null

  return (
    <FadeIn>
      <Accounts options={options} />
    </FadeIn>
  )
}
