import {
  ArrowDownIcon,
  CreditCardIcon,
  FolderIcon,
  MoreHorizontalIcon,
  RepeatIcon,
  SendIcon,
} from "@talismn/icons"
import { TalismanOrbRectangle } from "@talismn/orb"
import { classNames } from "@talismn/util"
import { AccountJsonAny, AccountType, TreeFolder } from "extension-core"
import { TALISMAN_WEB_APP_SWAP_URL } from "extension-shared"
import { FC, MouseEventHandler, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useMatch } from "react-router-dom"
import {
  ContextMenuTrigger,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { api } from "@ui/api"
import { AnalyticsEventName, AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useToggleCurrency } from "@ui/hooks/useToggleCurrency"
import { useBalanceTotals, useFeatureFlag, useSelectedCurrency } from "@ui/state"

import { AccountContextMenu } from "../Account/AccountContextMenu"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import { FolderContextMenu } from "../Account/FolderContextMenu"
import { usePortfolioNavigation } from "./usePortfolioNavigation"

const SelectionScope: FC<{ account: AccountJsonAny | null; folder?: TreeFolder | null }> = ({
  account,
  folder,
}) => {
  const { t } = useTranslation()

  if (account)
    return (
      <div className="flex h-14 w-full items-center gap-6 text-base">
        <div className="flex grow items-center gap-3 overflow-hidden">
          <AccountIcon
            className="shrink-0 text-[2rem]"
            address={account.address}
            genesisHash={account.genesisHash}
          />
          <div className="truncate">{account.name ?? shortenAddress(account.address)}</div>
          <AccountTypeIcon origin={account.origin} className="text-primary" />
        </div>
        <div className="shrink-0">
          <AccountContextMenu
            address={account.address}
            analyticsFrom="dashboard portfolio"
            placement="bottom-end"
            trigger={
              <IconButton className="bg-grey-800/50 hover:bg-grey-800/80 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm">
                <MoreHorizontalIcon className="text-base" />
              </IconButton>
            }
          />
        </div>
      </div>
    )

  if (folder)
    return (
      <div className="flex h-14 w-full items-center gap-6 text-base">
        <div className="flex grow items-center gap-3 overflow-hidden text-base">
          <div className="bg-grey-800 rounded-xs flex size-10 shrink-0 items-center justify-center">
            <FolderIcon className="text-primary shrink-0 text-xs" />
          </div>
          <div className="truncate">{folder.name}</div>
        </div>
        <div className="shrink-0">
          <FolderContextMenu
            folderId={folder.id}
            placement="bottom-end"
            trigger={
              <ContextMenuTrigger className="bg-grey-800/50 hover:bg-grey-800/80 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm">
                <MoreHorizontalIcon className="text-base" />
              </ContextMenuTrigger>
            }
          />
        </div>
      </div>
    )

  return (
    <div className="flex h-14 items-center gap-3 text-base">
      <AllAccountsIcon className="shrink-0 text-[2rem]" />
      <div>{t("All Accounts")}</div>
    </div>
  )
}

export const DashboardPortfolioHeader: FC<{ className?: string }> = ({ className }) => {
  const { selectedAccount, selectedAccounts, selectedFolder } = usePortfolioNavigation()
  const allBalanceTotals = useBalanceTotals()

  const currency = useSelectedCurrency()
  const toggleCurrency = useToggleCurrency()

  const totalPerAddress = useMemo(() => {
    const balanceTotals = allBalanceTotals.filter((b) => b.currency === currency)
    return Object.fromEntries(balanceTotals.map((t) => [t.address, t.total]))
  }, [allBalanceTotals, currency])

  const selectedTotal = useMemo(() => {
    return selectedAccounts.reduce((total, acc) => total + (totalPerAddress[acc.address] ?? 0), 0)
  }, [selectedAccounts, totalPerAddress])

  return (
    <div
      className={classNames(
        "bg-grey-900 relative z-0 flex h-[19.2rem] flex-col items-start justify-between rounded-lg p-10",
        className,
      )}
    >
      {!!selectedAccounts.length && (
        <TalismanOrbRectangle
          seed={selectedAccounts?.[0]?.address}
          className="absolute left-0 top-0 z-0 size-full select-none rounded-sm opacity-30"
        />
      )}
      <div className="font-inter z-[1] flex w-full flex-col gap-4 overflow-hidden">
        <SelectionScope folder={selectedFolder} account={selectedAccount} />
        <div className="flex w-full max-w-full items-center gap-6">
          <button
            className={classNames(
              "bg-grey-700/20 text-grey-200 hover:text-body hover:bg-body/10 pointer-events-auto flex size-[4.4rem] shrink-0 items-center justify-center rounded-full text-center text-lg leading-none shadow-[inset_0px_0px_1px_rgb(228_228_228_/_1)] transition-[box-shadow,color,background-color] duration-200 ease-out hover:shadow-[inset_0px_0px_2px_rgb(250_250_250_/_1)]",
              currencyConfig[currency]?.symbol?.length === 2 && "text-md",
              currencyConfig[currency]?.symbol?.length > 2 && "text-base",
            )}
            onClick={(event) => {
              event.stopPropagation()
              toggleCurrency()
            }}
          >
            {currencyConfig[currency]?.symbol}
          </button>
          <Fiat
            className={classNames(
              "font-inter overflow-hidden text-ellipsis whitespace-pre pr-10 text-[4.8rem] font-bold leading-[4.8rem]",
            )}
            amount={selectedTotal}
            isBalance
            currencyDisplay="code"
          />
        </div>
      </div>
      <TopActions />
    </div>
  )
}

type ActionProps = {
  analyticsName: AnalyticsEventName
  analyticsAction?: string
  label: string
  tooltip?: string
  icon: FC<{ className?: string }>
  onClick: () => void
  disabled: boolean
  disabledReason?: string
}

const Action: FC<ActionProps> = ({
  analyticsName,
  analyticsAction,
  label,
  tooltip,
  icon: Icon,
  onClick,
  disabled,
  disabledReason,
}) => {
  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation()
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: analyticsName,
        action: analyticsAction,
      })
      onClick()
    },
    [onClick, analyticsAction, analyticsName],
  )

  return (
    <Tooltip placement="bottom-start">
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-body-secondary enabled:hover:text-body pointer-events-auto flex h-10 items-center gap-3 px-2 text-base opacity-90 disabled:opacity-70"
          onClick={handleClick}
          disabled={disabled}
        >
          <div>
            <Icon className="size-8" />
          </div>
          <div>{label}</div>
        </button>
      </TooltipTrigger>
      {(!!disabledReason || !!tooltip) && (
        <TooltipContent>{disabledReason || tooltip}</TooltipContent>
      )}
    </Tooltip>
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Portfolio Home",
}

const TopActions: FC = () => {
  const { selectedAccounts, selectedAccount } = usePortfolioNavigation()
  const { t } = useTranslation()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const canBuy = useFeatureFlag("BUY_CRYPTO")

  const [disableActions, disabledReason] = useMemo(() => {
    if (!!selectedAccount && !isOwnedAccount(selectedAccount))
      return [true, t("Cannot send or receive funds on accounts that you don't own") as string]

    if (!selectedAccounts.some(isOwnedAccount))
      return [true, t("Cannot send or receive funds on accounts that you don't own") as string]

    return [false, ""]
  }, [selectedAccount, t, selectedAccounts])

  const selectedAddress = useMemo(() => selectedAccount?.address, [selectedAccount?.address])

  // this component is not located in the asset details route, so we can't use useParams
  const match = useMatch("/portfolio/tokens/:symbol")
  const symbol = useMemo(() => match?.params.symbol, [match])

  const topActions = useMemo(
    () =>
      [
        {
          analyticsName: "Goto",
          analyticsAction: "Send Funds button",
          label: t("Send"),
          icon: SendIcon,
          onClick: () =>
            api.sendFundsOpen({
              from: selectedAddress,
              tokenSymbol: symbol || undefined,
            }),
          disabled: disableActions,
          disabledReason,
        },
        {
          analyticsName: "Goto",
          analyticsAction: "open receive",
          label: t("Receive"),
          icon: ArrowDownIcon,
          onClick: () =>
            openCopyAddressModal({
              address: selectedAddress,
            }),
          disabled: disableActions,
          disabledReason,
        },
        {
          analyticsName: "Goto",
          analyticsAction: "open swap",
          label: t("Swap"),
          icon: RepeatIcon,
          onClick: () => window.open(TALISMAN_WEB_APP_SWAP_URL, "_blank"),
        },
        canBuy
          ? {
              analyticsName: "Goto",
              analyticsAction: "Buy Crypto button",
              label: t("Buy"),
              icon: CreditCardIcon,
              onClick: () => api.modalOpen({ modalType: "buy" }),
              disabled: disableActions,
              disabledReason,
            }
          : null,
      ].filter(Boolean) as Array<ActionProps>,
    [canBuy, disableActions, disabledReason, selectedAddress, openCopyAddressModal, symbol, t],
  )

  return (
    <div className="flex justify-center gap-4">
      {topActions.map((action, index) => (
        <Action key={index} {...action} />
      ))}
    </div>
  )
}

const isOwnedAccount = (account: AccountJsonAny) => {
  switch (account.origin) {
    case AccountType.Watched:
    case AccountType.Signet:
      return false
    default:
      return true
  }
}
