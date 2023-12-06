import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/BuyTokensModalContext"
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
  const { open: openBuyTokensModal } = useBuyTokensModal()

  const onDeposit = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "add funds",
    })
    openBuyTokensModal()
  }, [openBuyTokensModal])

  const onAddAccount = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "add account",
    })
    navigate("/accounts/add")
  }, [navigate])

  const onTryTalisman = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "try talisman",
    })
    api.popupOpen("#/portfolio/try-talisman")
  }, [])

  const onLearnMore = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "learn more",
    })
    api.popupOpen("#/portfolio/learn-more")
  }, [])

  return (
    <NoAccounts
      fullscreen
      onDeposit={onDeposit}
      onAddAccount={onAddAccount}
      onTryTalisman={onTryTalisman}
      onLearnMore={onLearnMore}
    />
  )
}
