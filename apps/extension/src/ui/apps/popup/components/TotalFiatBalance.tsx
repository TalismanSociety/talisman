import { EyeIcon, EyeOffIcon } from "@talismn/icons"
import type { AnalyticsPage } from "@ui/api/analytics"
import { TopActions } from "@ui/apps/popup/components/TopActions"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useToggleCurrency } from "@ui/hooks/useToggleCurrency"
import { useSelectedCurrency, useSetting } from "@ui/state/settings"
import { classNames } from "@ui/util/cn"
import { type MouseEventHandler, useCallback } from "react"
import { useTranslation } from "react-i18next"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Portfolio Home",
}

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
              "pointer-events-auto flex size-16 shrink-0 items-center justify-center rounded-full bg-grey-700/20 text-center text-grey-200 shadow-[inset_0px_0px_1px_rgb(228_228_228/1)] transition-[box-shadow,color,background-color] duration-200 ease-out hover:bg-body/10 hover:text-body hover:shadow-[inset_0px_0px_2px_rgb(250_250_250/1)]",
              currencyConfig[currency]?.symbol?.length === 2 && "text-xs",
              currencyConfig[currency]?.symbol?.length > 2 && "text-tiny"
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
              "overflow-hidden text-ellipsis whitespace-pre pr-10 font-bold font-inter text-xl leading-[2.25rem] tracking-[0.016px]",
              disabled && "text-body-secondary"
            )}
            amount={portfolioTotal}
            isBalance
            currencyDisplay="code"
          />
        </div>
      </div>
      <TopActions analyticsPage={ANALYTICS_PAGE} disabled={disabled} />
    </div>
  )
}
