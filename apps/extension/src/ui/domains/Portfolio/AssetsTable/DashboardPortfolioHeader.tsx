import { ArrowDownIcon, CreditCardIcon, FolderIcon, RepeatIcon, SendIcon } from "@talismn/icons"
import { TalismanOrbRectangle } from "@talismn/orb"
import { classNames } from "@talismn/util"
import { AccountJsonAny, TreeFolder } from "extension-core"
import { TALISMAN_WEB_APP_SWAP_URL } from "extension-shared"
import { useAtomValue } from "jotai"
import { FC, MouseEventHandler, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { api } from "@ui/api"
import { AnalyticsEventName, AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { balanceTotalsAtom } from "@ui/atoms"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import useAccounts from "@ui/hooks/useAccounts"
import { useSelectedCurrency, useToggleCurrency } from "@ui/hooks/useCurrency"
import { useIsFeatureEnabled } from "@ui/hooks/useIsFeatureEnabled"

import { usePortfolioNavigation } from "../usePortfolioNavigation"

const SelectionScope: FC<{ account: AccountJsonAny | null; folder?: TreeFolder | null }> = ({
  account,
  folder,
}) => {
  const { t } = useTranslation()

  if (account)
    return (
      <div className="flex items-center gap-3 text-base">
        <AccountIcon
          className="shrink-0 text-[2rem]"
          address={account.address}
          genesisHash={account.genesisHash}
        />
        <div>{account.name ?? shortenAddress(account.address)}</div>
      </div>
    )

  if (folder)
    return (
      <div className="flex items-center gap-3 text-base">
        <div className="bg-grey-800 rounded-xs flex size-10 shrink-0 items-center justify-center">
          <FolderIcon className=" text-primary shrink-0 text-xs" />
        </div>
        <div>{folder.name}</div>
      </div>
    )

  return (
    <div className="flex items-center gap-3 text-base">
      <AllAccountsIcon className="shrink-0 text-[2rem]" />
      <div>{t("All Accounts")}</div>
    </div>
  )
}

export const DashboardPortfolioHeader: FC<{ className?: string }> = ({ className }) => {
  const { selectedAccount, selectedAccounts, selectedFolder } = usePortfolioNavigation()
  //   const { accounts, catalog, balanceTotalPerAccount } = usePortfolioAccounts()

  const allBalanceTotals = useAtomValue(balanceTotalsAtom)

  const currency = useSelectedCurrency()
  const toggleCurrency = useToggleCurrency()

  const totalPerAddress = useMemo(() => {
    const balanceTotals = allBalanceTotals.filter((b) => b.currency === currency)
    return Object.fromEntries(balanceTotals.map((t) => [t.address, t.total]))
  }, [allBalanceTotals, currency])

  const selectedTotal = useMemo(() => {
    return selectedAccounts.reduce((total, acc) => total + totalPerAddress[acc.address] ?? 0, 0)
  }, [selectedAccounts, totalPerAddress])

  return (
    <div
      className={classNames(
        "bg-grey-900 relative flex h-[19.2rem] flex-col items-start justify-between rounded-lg px-8 pb-6 pt-12",
        className
      )}
    >
      {selectedAccounts.length && (
        <TalismanOrbRectangle
          seed={selectedAccounts?.[0]?.address}
          className="absolute left-0 top-0 z-0 size-full select-none rounded-sm opacity-30"
        />
      )}
      <div className="font-inter z-[1] flex flex-col gap-6">
        <SelectionScope folder={selectedFolder} account={selectedAccount} />
        <div className="flex w-full max-w-full items-center gap-6">
          <button
            className={classNames(
              "bg-grey-700/20 border-grey-200 text-grey-200 hover:text-body hover:bg-grey-700/10 hover:border-body pointer-events-auto flex size-[4.4rem] shrink-0 items-center justify-center rounded-full border text-center text-lg leading-none transition-colors duration-100 ease-out",
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
              "font-inter overflow-hidden text-ellipsis whitespace-pre pr-10 text-[4.8rem] font-bold leading-[4.8rem]"
            )}
            amount={selectedTotal}
            isBalance
            currencyDisplay="code"
          />
        </div>
      </div>
      <TopActions

      // TODOdisabled={disabled}
      />
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
          className="text-body-secondary hover:text-body pointer-events-auto flex h-10 items-center gap-3 px-2 text-base opacity-90"
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

const TopActions = ({ disabled }: { disabled?: boolean }) => {
  const { t } = useTranslation()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const ownedAccounts = useAccounts("owned")
  const canBuy = useIsFeatureEnabled("BUY_CRYPTO")

  const handleSwapClick = useCallback(() => {
    window.open(TALISMAN_WEB_APP_SWAP_URL, "_blank")
    window.close()
  }, [])

  const { disableActions, disabledReason } = useMemo(() => {
    const disableActions = disabled || !ownedAccounts.length
    const disabledReason = disableActions ? t("Add an account to send or receive funds") : undefined
    return { disableActions, disabledReason }
  }, [disabled, ownedAccounts.length, t])

  const topActions = useMemo(
    () =>
      [
        {
          analyticsName: "Goto",
          analyticsAction: "Send Funds button",
          label: t("Send"),
          icon: SendIcon,
          onClick: () => api.sendFundsOpen().then(() => window.close()),
          disabled: disableActions,
          disabledReason,
        },
        {
          analyticsName: "Goto",
          analyticsAction: "open receive",
          label: t("Receive"),
          icon: ArrowDownIcon,
          onClick: () => openCopyAddressModal(),
          disabled: disableActions,
          disabledReason,
        },
        {
          analyticsName: "Goto",
          analyticsAction: "open swap",
          label: t("Swap"),
          icon: RepeatIcon,
          onClick: () => handleSwapClick(),
        },
        canBuy
          ? {
              analyticsName: "Goto",
              analyticsAction: "Buy Crypto button",
              label: t("Buy"),
              icon: CreditCardIcon,
              onClick: () => api.modalOpen({ modalType: "buy" }).then(() => window.close()),
              disabled: disableActions,
              disabledReason,
            }
          : null,
      ].filter(Boolean) as Array<ActionProps>,
    [canBuy, disableActions, disabledReason, handleSwapClick, openCopyAddressModal, t]
  )

  return (
    <div className="flex justify-center gap-4">
      {topActions.map((action, index) => (
        <Action key={index} {...action} />
      ))}
    </div>
  )
}
