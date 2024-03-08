import { AccountJsonAny } from "@extension/core"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AllAccountsHeader } from "@ui/apps/popup/components/AllAccountsHeader"
import { NoAccounts as NoAccountsComponent } from "@ui/domains/Portfolio/EmptyStates/NoAccounts"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Onboarding",
  featureVersion: 1,
  page: "Popup - No Accounts",
}

export const NoAccountsPopup = ({ accounts }: { accounts: AccountJsonAny[] }) => {
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

  const onTryTalisman = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "try talisman" })
    navigate("/portfolio/try-talisman")
  }, [navigate])

  const onLearnMore = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "learn more" })
    navigate("/portfolio/learn-more")
  }, [navigate])

  return (
    <NoAccountsComponent
      hasSomeAccounts={!!accounts.length}
      onDeposit={onDeposit}
      onAddAccount={onAddAccount}
      onTryTalisman={onTryTalisman}
      onLearnMore={onLearnMore}
    />
  )
}

export const NoAccounts = () => {
  const { accounts } = usePortfolioAccounts()

  return (
    <div className="flex flex-col items-center gap-16 pb-12">
      <AllAccountsHeader accounts={accounts} />
      <NoAccountsPopup accounts={accounts} />
    </div>
  )
}
