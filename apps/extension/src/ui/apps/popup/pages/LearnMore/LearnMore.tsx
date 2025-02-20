import { ChevronLeftIcon } from "@talismn/icons"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { LearnMoreContent } from "@ui/domains/Portfolio/GetStarted/LearnMore/LearnMoreContent"

import { PopupContent, PopupLayout } from "../../Layout/PopupLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Learn More",
}

const newGoToFn = (analyticsAction: string, dashboardPath: string) => () => {
  sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: analyticsAction })
  return api.dashboardOpen(dashboardPath)
}
const goToSettingsAccounts = newGoToFn("Manage accounts", "/settings/accounts")
const goToSettingsCurrency = newGoToFn("Change currencies", "/settings/general/currency")
const goToAddHardwareAccounts = newGoToFn(
  "Add hardware accounts",
  "/accounts/add?methodType=connect",
)
const goToSettingsMnemonics = newGoToFn("Manage mnemonics", "/settings/mnemonics")

const Header = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goToPortfolio = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Portfolio" })
    return navigate("/portfolio")
  }, [navigate])

  return (
    <header className="my-8 flex h-[3.6rem] w-full shrink-0 items-center justify-between gap-4 px-8">
      <div className="flex-1">
        <IconButton onClick={goToPortfolio}>
          <ChevronLeftIcon />
        </IconButton>
      </div>
      <div className="font-bold">{t("Learn More")}</div>
      <div className="flex-1 text-right">
        <span />
      </div>
    </header>
  )
}

export const LearnMorePage = () => (
  <PopupLayout>
    <Header />
    <PopupContent>
      <LearnMoreContent
        onAddHardwareClick={goToAddHardwareAccounts}
        onCurrenciesClick={goToSettingsCurrency}
        onManageAccountsClick={goToSettingsAccounts}
        onMnemonicsClick={goToSettingsMnemonics}
      />
    </PopupContent>
  </PopupLayout>
)
