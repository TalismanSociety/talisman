import {
  ArrowDownIcon,
  CreditCardIcon,
  EyeIcon,
  EyeOffIcon,
  RepeatIcon,
  SeekEyeIcon,
  SendIcon,
} from "@talismn/icons"
import { classNames, isNotNil } from "@talismn/util"
import { api } from "@ui/api"
import { type AnalyticsEventName, type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useSeekBenefitsModal } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsModal"
import { useRampsModal } from "@ui/domains/Ramps/useRampsModal"
import { useSwapTokensModal } from "@ui/domains/Swap/hooks/useSwapTokensModal"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useToggleCurrency } from "@ui/hooks/useToggleCurrency"
import { useAccounts, useFeatureFlag, useSelectedCurrency, useSetting } from "@ui/state"
import { type FC, type MouseEventHandler, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

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
    <div className={classNames("flex flex-col items-start justify-between", className)}>
      <div className="flex flex-col gap-2 font-inter">
        <div className="flex gap-4 text-body text-xs">
          <div className="leading-10 tracking-[0.06px]">{t("Total Portfolio")}</div>
          <button
            type="button"
            className={classNames(
              "pointer-events-auto text-grey-200 opacity-0 transition-opacity hover:text-body focus:text-body",
              (hideBalances || mouseOver) && "opacity-100"
            )}
            onClick={toggleHideBalance}
          >
            {hideBalances ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        </div>
        <div className="flex w-full max-w-full items-center gap-2">
          <button
            type="button"
            className={classNames(
              "pointer-events-auto flex size-16 shrink-0 items-center justify-center rounded-full bg-grey-700/20 text-center text-grey-200 shadow-[inset_0px_0px_1px_rgb(228_228_228_/_1)] transition-[box-shadow,color,background-color] duration-200 ease-out hover:bg-body/10 hover:text-body hover:shadow-[inset_0px_0px_2px_rgb(250_250_250_/_1)]",
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
              "overflow-hidden text-ellipsis whitespace-pre pr-10 font-bold font-inter text-[3.2rem] leading-[3.6rem] tracking-[0.016px]",
              disabled && "text-body-secondary"
            )}
            amount={portfolioTotal}
            isBalance
            currencyDisplay="code"
          />
        </div>
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
            "pointer-events-auto flex h-10 items-center gap-2 rounded-full bg-white/5 px-3 text-[1rem] text-body-secondary opacity-90 backdrop-blur-sm",
            "enabled:hover:bg-white/10 enabled:hover:text-body"
          )}
          onClick={handleClick}
          disabled={disabled}
        >
          <div>
            <Icon className="size-6" />
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
  const { t, i18n } = useTranslation()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { open: openRampsModal } = useRampsModal()
  const { open: openSwapTokensModal } = useSwapTokensModal()
  const ownedAccounts = useAccounts("owned")
  const canBuy = useFeatureFlag("BUY_CRYPTO")
  const showSeekBenefits = useFeatureFlag("SEEK_BENEFITS")

  const { disableActions, disabledReason } = useMemo(() => {
    const disableActions = disabled || !ownedAccounts.length
    const disabledReason = disableActions ? t("Add an account to send or receive funds") : undefined
    return { disableActions, disabledReason }
  }, [disabled, ownedAccounts.length, t])

  const topActions = useMemo<ActionProps[]>(
    () =>
      [
        {
          analyticsName: "Goto" as const,
          analyticsAction: "Send Funds button",
          label: t("Send"),
          icon: SendIcon,
          onClick: () => api.sendFundsOpen().then(() => window.close()),
          disabled: disableActions,
          disabledReason,
        },
        {
          analyticsName: "Goto" as const,
          analyticsAction: "open receive",
          label: t("Receive"),
          icon: ArrowDownIcon,
          onClick: () => openCopyAddressModal(),
          disabled: disableActions,
          disabledReason,
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
      canBuy,
      disableActions,
      disabledReason,
      openCopyAddressModal,
      openRampsModal,
      openSwapTokensModal,
      t,
    ]
  )

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex justify-center gap-4">
        {topActions.map((action, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <Action key={index} {...action} />
        ))}
      </div>
      {i18n.language === "en" && // not enough space in other languages
        !!showSeekBenefits && <SeekBenefitsLink />}
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
        "pointer-events-auto flex items-center gap-2.5 text-[1rem] text-primary-700 hover:text-primary"
      )}
      onClick={handleSeekClick}
    >
      <div className="flex flex-col justify-center text-sm">
        <SeekEyeIcon />
      </div>
      <div>SEEK</div>
    </button>
  )
}
