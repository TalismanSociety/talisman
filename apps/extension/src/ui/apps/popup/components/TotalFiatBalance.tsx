import { ArrowDownIcon, CreditCardIcon, EyeIcon, EyeOffIcon, SendIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsEventName, AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import currencyConfig from "@ui/domains/Asset/currencyConfig"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import { useSelectedCurrency, useToggleCurrency } from "@ui/hooks/useCurrency"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useSetting } from "@ui/hooks/useSettings"
import { ComponentProps, MouseEventHandler, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

type Props = {
  className?: string
  mouseOver: boolean
}

export const TotalFiatBalance = ({ className, mouseOver }: Props) => {
  const { t } = useTranslation()
  const balances = useBalances("portfolio")
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
          className="font-surtExpanded text-lg"
          amount={balances.sum.fiat(currency).total}
          isBalance
          hideSymbol
        />
      </div>
      <TopActions />
    </div>
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Portfolio Home",
}

const TopActions = () => {
  const { t } = useTranslation()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const canBuy = useIsFeatureEnabled("BUY_CRYPTO")

  const topActions = useMemo(() => {
    const topActions: Array<{
      analyticsName: AnalyticsEventName
      analyticsAction?: string
      label: string
      icon: ComponentProps<typeof PillButton>["icon"]
      action: () => void
    }> = [
      {
        analyticsName: "Goto",
        analyticsAction: "open receive",
        label: t("Receive"),
        icon: ArrowDownIcon,
        action: () => openCopyAddressModal({ mode: "receive" }),
      },
      {
        analyticsName: "Goto",
        analyticsAction: "Send Funds button",
        label: t("Send"),
        icon: SendIcon,
        action: () => api.sendFundsOpen().then(() => window.close()),
      },
    ]
    if (canBuy)
      topActions.push({
        analyticsName: "Goto",
        analyticsAction: "Buy Crypto button",
        label: t("Buy"),
        icon: CreditCardIcon,
        action: () => api.modalOpen({ modalType: "buy" }).then(() => window.close()),
      })
    return topActions
  }, [canBuy, openCopyAddressModal, t])

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
        <PillButton
          key={index}
          className="pointer-events-auto opacity-90"
          onClick={handleClicks[index]}
          icon={action.icon}
        >
          {action.label}
        </PillButton>
      ))}
    </div>
  )
}
