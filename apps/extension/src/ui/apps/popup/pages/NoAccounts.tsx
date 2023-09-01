import { CreditCardIcon, PaperPlaneIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { NoAccounts as NoAccountsComponent } from "@ui/domains/Portfolio/EmptyStates/NoAccounts"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Onboarding",
  featureVersion: 1,
  page: "Popup - No Accounts",
}

export const NoAccountsPopup = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)

  const handleAddAccountClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "add account",
    })
    api.dashboardOpen("/accounts/add")
  }, [])

  const handleWatchAccountClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "watch account",
    })
    api.dashboardOpen("/accounts/add/watched")
  }, [])

  return (
    <NoAccountsComponent
      handleAddAccountClick={handleAddAccountClick}
      handleWatchAccountClick={handleWatchAccountClick}
    />
  )
}

export const NoAccounts = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-16">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center justify-center gap-6">
          <span className="text-body-secondary">{t("No accounts")}</span>
          <span className="text-body-disabled font-surtExpanded text-lg font-bold">
            {(0).toLocaleString("en-us", {
              style: "currency",
              currency: "usd",
              currencyDisplay: "narrowSymbol",
            })}
          </span>
        </div>
        <div className="flex justify-center gap-4">
          <PillButton
            disabled
            className="disabled:bg-body-secondary pointer-events-auto disabled:bg-opacity-[0.15] disabled:opacity-100"
            icon={PaperPlaneIcon}
          >
            Send
          </PillButton>
          <PillButton
            disabled
            className="disabled:bg-body-secondary pointer-events-auto disabled:bg-opacity-[0.15] disabled:opacity-100"
            icon={CreditCardIcon}
          >
            Buy
          </PillButton>
        </div>
      </div>
      <NoAccountsPopup />
    </div>
  )
}
