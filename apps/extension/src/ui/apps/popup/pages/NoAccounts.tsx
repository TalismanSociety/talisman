import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AllAccountsHeader } from "@ui/apps/popup/pages/Portfolio/PortfolioAccounts"
import { NoAccounts as NoAccountsComponent } from "@ui/domains/Portfolio/EmptyStates/NoAccounts"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Onboarding",
  featureVersion: 1,
  page: "Popup - No Accounts",
}

export const NoAccountsPopup = ({ hasSomeAccounts }: { hasSomeAccounts?: boolean }) => {
  useAnalyticsPageView(ANALYTICS_PAGE)

  const navigate = useNavigate()

  const onDeposit = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "add funds" })
    api.dashboardOpen(`/portfolio?buyTokens`)
  }, [])

  const onAddAccount = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "add account" })
    api.dashboardOpen("/accounts/add")
  }, [])

  const onWatchAccount = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "watch account" })
    api.dashboardOpen("/accounts/add/watched")
  }, [])

  const onLearnMore = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "learn more" })
    navigate("/portfolio/learn-more")
  }, [navigate])

  return (
    <NoAccountsComponent
      hasSomeAccounts={hasSomeAccounts}
      onDeposit={onDeposit}
      onAddAccount={onAddAccount}
      onWatchAccount={onWatchAccount}
      onLearnMore={onLearnMore}
    />
  )
}

export const NoAccounts = ({ hasSomeAccounts }: { hasSomeAccounts?: boolean }) => (
  <div className="flex flex-col items-center gap-16 pb-12">
    <AllAccountsHeader disabled />
    <NoAccountsPopup hasSomeAccounts={hasSomeAccounts} />
  </div>
)
