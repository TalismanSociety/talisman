import { isAccountOwned } from "@core/domains/keyring/exports"
import {
  ArrowDownIcon,
  CreditCardIcon,
  RepeatIcon,
  SeekEyeIcon,
  SendIcon,
  TaoIcon,
} from "@talismn/icons"
import { classNames, isNotNil } from "@talismn/util"
import { api } from "@ui/api"
import { type AnalyticsEventName, type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useSeekBenefitsModal } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsModal"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useRampsModal } from "@ui/domains/Ramps/useRampsModal"
import { useSwapModal } from "@ui/domains/Swap/hooks/useSwapModal"
import { useIsBittensorEnabled } from "@ui/domains/TaoDashboard/hooks/useIsBittensorEnabled"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { type FC, type MouseEventHandler, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useMatch } from "react-router-dom"

type DashboardTopActionsProps = {
  analyticsPage: AnalyticsPage
  className?: string
}

export const DashboardTopActions: FC<DashboardTopActionsProps> = ({ analyticsPage, className }) => {
  const { selectedAccounts, selectedAccount } = usePortfolioNavigation()
  const { t } = useTranslation()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { open: openSwapModal } = useSwapModal()
  const { open: openRampsModal } = useRampsModal()
  const canBuy = useFeatureFlag("BUY_CRYPTO")
  const showSeekLink = useFeatureFlag("SEEK_BENEFITS")
  const isBittensorEnabled = useIsBittensorEnabled()

  const [disableActions, disabledReason] = useMemo(() => {
    if (!!selectedAccount && !isAccountOwned(selectedAccount))
      return [true, t("Cannot send or receive funds on accounts that you don't own") as string]

    if (!selectedAccounts.some(isAccountOwned))
      return [true, t("Cannot send or receive funds on accounts that you don't own") as string]

    return [false, ""]
  }, [selectedAccount, t, selectedAccounts])

  const selectedAddress = useMemo(() => selectedAccount?.address, [selectedAccount?.address])

  // not located in the asset details route, so we can't use useParams
  const match = useMatch("/portfolio/tokens/:symbol")
  const symbol = useMemo(() => match?.params.symbol, [match])

  const actions = useMemo<ActionDef[]>(
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
          disabled: !selectedAccounts.length,
        },
        {
          analyticsName: "Goto" as const,
          analyticsAction: "open swap",
          label: t("Swap"),
          icon: RepeatIcon,
          onClick: () => openSwapModal({}),
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
        isBittensorEnabled
          ? {
              analyticsName: "Goto" as const,
              analyticsAction: "open tao dashboard",
              label: t("Trade TAO"),
              icon: TaoIcon,
              onClick: () => api.dashboardOpen("/bittensor/subnets"),
              disabled: false,
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
      openSwapModal,
      openRampsModal,
      isBittensorEnabled,
    ]
  )

  return (
    <div className={classNames("flex w-full items-center justify-between gap-8", className)}>
      <div className="flex justify-center gap-4" data-testid="top-actions-buttons">
        {actions.map((action, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <Action key={index} analyticsPage={analyticsPage} {...action} />
        ))}
      </div>
      {!!showSeekLink && <SeekBenefitsLink analyticsPage={analyticsPage} />}
    </div>
  )
}

type ActionDef = {
  analyticsName: AnalyticsEventName
  analyticsAction?: string
  label: string
  tooltip?: string
  icon: FC<{ className?: string }>
  onClick: () => void
  disabled: boolean
  disabledReason?: string
}

type ActionProps = ActionDef & {
  analyticsPage: AnalyticsPage
}

const Action: FC<ActionProps> = ({
  analyticsPage,
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
        ...analyticsPage,
        name: analyticsName,
        action: analyticsAction,
      })
      onClick()
    },
    [onClick, analyticsAction, analyticsName, analyticsPage]
  )

  return (
    <Tooltip placement="bottom-start">
      <TooltipTrigger asChild>
        <button
          type="button"
          className={classNames(
            "pointer-events-auto flex h-14 items-center gap-4 rounded-full bg-white/5 px-5 text-base text-body-secondary opacity-90 backdrop-blur-xs disabled:opacity-70",
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

const SeekBenefitsLink: FC<{ analyticsPage: AnalyticsPage }> = ({ analyticsPage }) => {
  const { open } = useSeekBenefitsModal()

  const handleSeekClick = useCallback(() => {
    sendAnalyticsEvent({ ...analyticsPage, name: "Goto", action: "SEEK" })
    open()
  }, [analyticsPage, open])

  return (
    <button
      type="button"
      className="flex shrink-0 items-center gap-3 text-base text-primary-700 hover:text-primary"
      onClick={handleSeekClick}
    >
      <div className="flex flex-col justify-center text-[1.25rem]">
        <SeekEyeIcon />
      </div>
      <div>SEEK</div>
    </button>
  )
}
