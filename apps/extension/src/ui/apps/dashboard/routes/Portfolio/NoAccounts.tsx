import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { NoAccounts } from "@ui/domains/Portfolio/EmptyStates/NoAccounts"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 1,
  page: "Dashboard - No Accounts",
}

export const NoAccountsFullscreen = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()

  const handleAddAccountClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "add account",
    })
    navigate("/accounts/add")
  }, [navigate])

  const handleWatchAccountClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "watch account",
    })
    navigate("/accounts/add/watched")
  }, [navigate])

  return (
    <NoAccounts
      handleAddAccountClick={handleAddAccountClick}
      handleWatchAccountClick={handleWatchAccountClick}
    />
  )
}
