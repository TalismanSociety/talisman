import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { NoAccounts as NoAccountsComponent } from "@ui/domains/Portfolio/EmptyStates/NoAccounts"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Onboarding",
  featureVersion: 1,
  page: "Popup - No Accounts",
}

export const NoAccountsPopup = ({ hasSomeAccounts }: { hasSomeAccounts?: boolean }) => {
  useAnalyticsPageView(ANALYTICS_PAGE)

  const onDeposit = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "add funds",
    })
    api.dashboardOpen(`/portfolio?buyTokens`)
  }, [])

  const onAddAccount = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "add account",
    })
    api.dashboardOpen("/accounts/add")
  }, [])

  const onWatchAccount = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "watch account",
    })
    api.dashboardOpen("/accounts/add/watched")
  }, [])

  return (
    <NoAccountsComponent
      hasSomeAccounts={hasSomeAccounts}
      onDeposit={onDeposit}
      onAddAccount={onAddAccount}
      onWatchAccount={onWatchAccount}
    />
  )
}

export const NoAccounts = ({ hasSomeAccounts }: { hasSomeAccounts?: boolean }) => {
  const { t } = useTranslation()
  const currency = useSelectedCurrency()

  return (
    <div className="flex flex-col items-center gap-16 pb-12">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center justify-center gap-6">
          <span className="text-body-secondary">{t("No accounts")}</span>
          <span className="text-body-disabled font-surtExpanded text-lg font-bold">
            {(0).toLocaleString("en-us", {
              style: "currency",
              currency,
              currencyDisplay: "narrowSymbol",
            })}
          </span>
        </div>
      </div>
      <NoAccountsPopup hasSomeAccounts={hasSomeAccounts} />
    </div>
  )
}
