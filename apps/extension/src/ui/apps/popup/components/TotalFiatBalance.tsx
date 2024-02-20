import { CopyIcon, CreditCardIcon, EyeIcon, EyeOffIcon, SendIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsEventName, AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import currencyConfig from "@ui/domains/Asset/currencyConfig"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSelectedCurrency, useToggleCurrency } from "@ui/hooks/useCurrency"
import { useIsFeatureEnabled } from "@ui/hooks/useIsFeatureEnabled"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useSetting } from "@ui/hooks/useSettings"
import { ComponentProps, MouseEventHandler, useCallback, useMemo } from "react"
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
      <div className="flex items-center gap-2">
        <button
          className="bg-grey-800 border-grey-750 text-body-secondary hover:bg-grey-700 pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border text-center transition-colors duration-100 ease-out"
          onClick={(event) => {
            event.stopPropagation()
            toggleCurrency()
          }}
        >
          {currencyConfig[currency]?.unicodeCharacter}
        </button>
        <Fiat
          className={classNames("font-surtExpanded text-lg", disabled && "text-body-secondary")}
          amount={portfolioTotal}
          isBalance
          currencyDisplay="code"
        />
      </div>
      <TopActions disabled={disabled} />
    </div>
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
    const disableActions = !ownedAccounts.length
    const disabledReason = disableActions ? t("Add an account to send or receive funds") : undefined
    return { disableActions, disabledReason }
  }, [ownedAccounts.length, t])

  const topActions = useMemo(() => {
    const topActions: Array<{
      analyticsName: AnalyticsEventName
      analyticsAction?: string
      label: string
      icon: ComponentProps<typeof PillButton>["icon"]
      action: () => void
      disabled: boolean
      disabledReason?: string
    }> = [
      {
        analyticsName: "Goto",
        analyticsAction: "open receive",
        label: t("Copy"),
        icon: CopyIcon,
        action: () => openCopyAddressModal(null),
        disabled: disableActions,
        disabledReason,
      },
      {
        analyticsName: "Goto",
        analyticsAction: "Send Funds button",
        label: t("Send"),
        icon: SendIcon,
        action: () => api.sendFundsOpen().then(() => window.close()),
        disabled: disableActions,
        disabledReason,
      },
    ]
    if (canBuy)
      topActions.push({
        analyticsName: "Goto",
        analyticsAction: "Buy Crypto button",
        label: t("Buy"),
        icon: CreditCardIcon,
        action: () => api.modalOpen({ modalType: "buy" }).then(() => window.close()),
        disabled: disableActions,
        disabledReason,
      })
    return topActions
  }, [canBuy, disableActions, disabledReason, openCopyAddressModal, t])

  const handleClicks = useMemo(
    () =>
      topActions.map(
        (topAction): MouseEventHandler<HTMLButtonElement> =>
          (event) => {
            event.stopPropagation()
            sendAnalyticsEvent({
              ...ANALYTICS_PAGE,
              name: topAction.analyticsName,
              action: topAction.analyticsAction,
            })
            topAction.action()
          }
      ),
    [topActions]
  )

  return (
    <div className="flex justify-center gap-4">
      {topActions.map((action, index) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <PillButton
              className="pointer-events-auto opacity-90"
              onClick={handleClicks[index]}
              icon={action.icon}
              disabled={disabled || action.disabled}
            >
              {action.label}
            </PillButton>
          </TooltipTrigger>
          {!!action.disabledReason && <TooltipContent>{action.disabledReason}</TooltipContent>}
        </Tooltip>
      ))}
    </div>
  )
}
