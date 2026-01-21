import { shortenAddress } from "@talisman/util/shortenAddress"
import {
  ArrowDownIcon,
  CreditCardIcon,
  FolderIcon,
  MoreHorizontalIcon,
  RepeatIcon,
  SeekEyeIcon,
  SendIcon,
} from "@talismn/icons"
import { TalismanOrbRectangle } from "@talismn/orb"
import { classNames, isNotNil } from "@talismn/util"
import { api } from "@ui/api"
import { type AnalyticsEventName, type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AccountContextMenu } from "@ui/domains/Account/AccountContextMenu"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { FolderContextMenu } from "@ui/domains/Account/FolderContextMenu"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useRampsModal } from "@ui/domains/Ramps/useRampsModal"
import { useSwapTokensModal } from "@ui/domains/Swap/hooks/useSwapTokensModal"
import { useToggleCurrency } from "@ui/hooks/useToggleCurrency"
import { useBalanceTotals, useFeatureFlag, useSelectedCurrency } from "@ui/state"
import {
  type Account,
  getAccountGenesisHash,
  isAccountOwned,
  type TreeFolder,
} from "extension-core"
import { type FC, type MouseEventHandler, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useMatch } from "react-router-dom"
import {
  ContextMenuTrigger,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

import { useSeekBenefitsModal } from "./SeekBenefits/SeekBenefitsModal"
import { usePortfolioNavigation } from "./usePortfolioNavigation"

const SelectionScope: FC<{ account: Account | null; folder?: TreeFolder | null }> = ({
  account,
  folder,
}) => {
  const { t } = useTranslation()

  if (account)
    return (
      <div className="flex h-14 w-full items-center gap-6 text-base">
        <div className="flex h-14 grow items-center gap-3 overflow-hidden">
          <AccountIcon
            className="shrink-0 text-[2rem]"
            address={account.address}
            genesisHash={getAccountGenesisHash(account)}
          />
          <div className="truncate">{account.name ?? shortenAddress(account.address)}</div>
          <AccountTypeIcon type={account.type} className="text-primary" />
        </div>
        <div className="shrink-0">
          <AccountContextMenu
            address={account.address}
            analyticsFrom="dashboard portfolio"
            placement="bottom-end"
            trigger={
              <IconButton className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-grey-800/50 hover:bg-grey-800/80">
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
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xs bg-grey-800">
            <FolderIcon className="shrink-0 text-primary text-xs" />
          </div>
          <div className="truncate">{folder.name}</div>
        </div>
        <div className="shrink-0">
          <FolderContextMenu
            folderId={folder.id}
            placement="bottom-end"
            trigger={
              <ContextMenuTrigger className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-grey-800/50 hover:bg-grey-800/80">
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
  const balanceTotals = useBalanceTotals()

  const currency = useSelectedCurrency()
  const toggleCurrency = useToggleCurrency()

  const selectedTotal = useMemo(() => {
    return selectedAccounts.reduce((total, acc) => total + (balanceTotals[acc.address] ?? 0), 0)
  }, [selectedAccounts, balanceTotals])

  return (
    <div
      className={classNames(
        "relative z-0 flex h-[19.2rem] flex-col items-start justify-between rounded-lg bg-grey-900 p-10",
        className
      )}
    >
      {!!selectedAccounts.length && (
        <TalismanOrbRectangle
          seed={selectedAccounts?.[0]?.address}
          className="absolute top-0 left-0 z-0 size-full select-none rounded-sm opacity-30"
        />
      )}
      <div className="z-[1] flex w-full flex-col gap-4 overflow-hidden font-inter">
        <SelectionScope folder={selectedFolder} account={selectedAccount} />
        <div className="flex w-full max-w-full items-center gap-6">
          <button
            type="button"
            className={classNames(
              "pointer-events-auto flex size-[4.4rem] shrink-0 items-center justify-center rounded-full bg-grey-700/20 text-center text-grey-200 text-lg leading-none shadow-[inset_0px_0px_1px_rgb(228_228_228_/_1)] transition-[box-shadow,color,background-color] duration-200 ease-out hover:bg-body/10 hover:text-body hover:shadow-[inset_0px_0px_2px_rgb(250_250_250_/_1)]",
              currencyConfig[currency]?.symbol?.length === 2 && "text-md",
              currencyConfig[currency]?.symbol?.length > 2 && "text-base"
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
              "overflow-hidden text-ellipsis whitespace-pre pr-10 font-bold font-inter text-[4.8rem] leading-[4.8rem]"
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
    [onClick, analyticsAction, analyticsName]
  )

  return (
    <Tooltip placement="bottom-start">
      <TooltipTrigger asChild>
        <button
          type="button"
          className={classNames(
            "pointer-events-auto flex h-14 items-center gap-4 rounded-full bg-white/5 px-5 text-base text-body-secondary opacity-90 backdrop-blur-sm disabled:opacity-70",
            "enabled:hover:bg-white/10 enabled:hover:text-body"
          )}
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
  const { open: openSwapTokensModal } = useSwapTokensModal()
  const { open: openRampsModal } = useRampsModal()
  const canBuy = useFeatureFlag("BUY_CRYPTO")
  const showSeekLink = useFeatureFlag("SEEK_BENEFITS")

  const [disableActions, disabledReason] = useMemo(() => {
    if (!!selectedAccount && !isAccountOwned(selectedAccount))
      return [true, t("Cannot send or receive funds on accounts that you don't own") as string]

    if (!selectedAccounts.some(isAccountOwned))
      return [true, t("Cannot send or receive funds on accounts that you don't own") as string]

    return [false, ""]
  }, [selectedAccount, t, selectedAccounts])

  const selectedAddress = useMemo(() => selectedAccount?.address, [selectedAccount?.address])

  // this component is not located in the asset details route, so we can't use useParams
  const match = useMatch("/portfolio/tokens/:symbol")
  const symbol = useMemo(() => match?.params.symbol, [match])

  const topActions = useMemo<ActionProps[]>(
    () =>
      [
        {
          analyticsName: "Goto" as const,
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
          analyticsName: "Goto" as const,
          analyticsAction: "open receive",
          label: !!selectedAccount && !isAccountOwned(selectedAccount) ? t("Copy") : t("Receive"),
          icon: ArrowDownIcon,
          onClick: () =>
            openCopyAddressModal({
              address: selectedAddress,
            }),
          disabled: !selectedAccounts.length, // always allow, as long as there is at least one account
        },
        {
          analyticsName: "Goto" as const,
          analyticsAction: "open swap",
          label: t("Swap"),
          icon: RepeatIcon,
          onClick: () => openSwapTokensModal(),
          disabled: disableActions,
          disabledReason,
        },
        canBuy
          ? {
              analyticsName: "Goto" as const,
              analyticsAction: "open ramps",
              label: t("Buy/Sell"),
              icon: CreditCardIcon,
              onClick: () => openRampsModal(),
              disabled: disableActions,
              disabledReason,
            }
          : null,
      ].filter(isNotNil),
    [
      t,
      disableActions,
      disabledReason,
      selectedAccount,
      selectedAccounts.length,
      canBuy,
      selectedAddress,
      symbol,
      openCopyAddressModal,
      openSwapTokensModal,
      openRampsModal,
    ]
  )

  return (
    <div className="z-[1] flex w-full items-center justify-between gap-8">
      <div className="flex justify-center gap-4" data-testid="top-actions-buttons">
        {topActions.map((action, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: legacy
          <Action key={index} {...action} />
        ))}
      </div>
      {!!showSeekLink && <SeekBenefitsLink />}
    </div>
  )
}

const SeekBenefitsLink = () => {
  const { open } = useSeekBenefitsModal()

  const handleSeekClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "SEEK" })
    open()
  }, [open])

  return (
    <button
      type="button"
      className={classNames(
        "flex shrink-0 items-center gap-3 text-base text-primary-700 hover:text-primary"
      )}
      onClick={handleSeekClick}
    >
      <div className="flex flex-col justify-center text-[2rem]">
        <SeekEyeIcon />
      </div>
      <div>SEEK</div>
    </button>
  )
}
