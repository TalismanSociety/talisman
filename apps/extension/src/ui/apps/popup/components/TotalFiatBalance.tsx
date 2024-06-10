import { ArrowDownIcon, CreditCardIcon, EyeIcon, EyeOffIcon, SendIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsEventName, AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSelectedCurrency, useToggleCurrency } from "@ui/hooks/useCurrency"
import { useIsFeatureEnabled } from "@ui/hooks/useIsFeatureEnabled"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useSetting } from "@ui/hooks/useSettings"
import { ComponentProps, FC, MouseEventHandler, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type Props = {
  className?: string
  mouseOver: boolean
  disabled?: boolean
}

export const TotalFiatBalance = ({ className, mouseOver, disabled }: Props) => {
  const { t } = useTranslation()
  const { portfolioTotal } = usePortfolioAccounts()
  const currency = useSelectedCurrency()
  const toggleCurrency = useToggleCurrency()

  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const { genericEvent } = useAnalytics()

  const toggleHideBalance: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation()
      genericEvent("toggle hide balance")
      setHideBalances((prev) => !prev)
    },
    [genericEvent, setHideBalances]
  )

  return (
    <div className={classNames("flex flex-col items-start justify-center gap-4", className)}>
      <div className="text-body-secondary mt-2 flex gap-2 text-sm">
        <span>{t("Total Portfolio")}</span>
        <button
          className={classNames(
            "hover:text-body focus:text-body pointer-events-auto opacity-0 transition-opacity",
            disabled && "hover:text-body-secondary focus:text-body-secondary",
            (hideBalances || mouseOver) && "opacity-100"
          )}
          onClick={toggleHideBalance}
        >
          {hideBalances ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>
      <div className="flex w-full max-w-full items-center gap-2">
        <button
          className={classNames(
            "bg-grey-800 border-grey-750 text-body-secondary hover:bg-grey-700 pointer-events-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-center transition-colors duration-100 ease-out",
            currencyConfig[currency]?.symbol?.length === 2 && "text-xs",
            currencyConfig[currency]?.symbol?.length > 2 && "text-[1rem]"
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
            "font-surtExpanded overflow-hidden text-ellipsis whitespace-pre pr-10 text-lg",
            disabled && "text-body-secondary"
          )}
          amount={portfolioTotal}
          isBalance
          currencyDisplay="code"
        />
      </div>
      <TopActions disabled={disabled} />
    </div>
  )
}

type ActionProps = {
  analyticsName: AnalyticsEventName
  analyticsAction?: string
  label: string
  tooltip?: string
  icon: ComponentProps<typeof PillButton>["icon"]
  onClick: () => void
  disabled: boolean
  disabledReason?: string
}

const Action: FC<ActionProps> = ({
  analyticsName,
  analyticsAction,
  label,
  tooltip,
  icon,
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
        <PillButton
          className="pointer-events-auto opacity-90"
          onClick={handleClick}
          icon={icon}
          disabled={disabled}
        >
          {label}
        </PillButton>
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

  const { disableActions, disabledReason } = useMemo(() => {
    const disableActions = disabled || !ownedAccounts.length
    const disabledReason = disableActions ? t("Add an account to send or receive funds") : undefined
    return { disableActions, disabledReason }
  }, [disabled, ownedAccounts.length, t])

  const topActions = useMemo(() => {
    const topActions: Array<ActionProps> = [
      {
        analyticsName: "Goto",
        analyticsAction: "open receive",
        label: t("Receive"),
        tooltip: t("Copy address"),
        icon: ArrowDownIcon,
        onClick: () => openCopyAddressModal(),
        disabled: disableActions,
        disabledReason,
      },
      {
        analyticsName: "Goto",
        analyticsAction: "Send Funds button",
        label: t("Send"),
        tooltip: t("Send tokens"),
        icon: SendIcon,
        onClick: () => api.sendFundsOpen().then(() => window.close()),
        disabled: disableActions,
        disabledReason,
      },
    ]
    if (canBuy)
      topActions.push({
        analyticsName: "Goto",
        analyticsAction: "Buy Crypto button",
        label: t("Buy"),
        tooltip: t("Buy tokens"),
        icon: CreditCardIcon,
        onClick: () => api.modalOpen({ modalType: "buy" }).then(() => window.close()),
        disabled: disableActions,
        disabledReason,
      })
    return topActions
  }, [canBuy, disableActions, disabledReason, openCopyAddressModal, t])

  return (
    <div className="flex justify-center gap-4">
      {topActions.map((action, index) => (
        <Action key={index} {...action} />
      ))}
    </div>
  )
}
