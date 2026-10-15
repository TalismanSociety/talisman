import { ChevronLeftIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { IconButton } from "@ui/components/IconButton"
import { LearnMoreContent } from "@ui/domains/Portfolio/GetStarted/LearnMore/LearnMoreContent"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { PopupContent, PopupLayout } from "../../Layout/PopupLayout"

const goToSettingsAccounts = () => api.dashboardOpen("/settings/accounts")
const goToSettingsCurrency = () => api.dashboardOpen("/settings/general/currency")
const goToAddHardwareAccounts = () => api.dashboardOpen("/accounts/add?methodType=connect")
const goToSettingsMnemonics = () => api.dashboardOpen("/settings/mnemonics")

const Header = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goToPortfolio = useCallback(() => {
    return navigate("/portfolio")
  }, [navigate])

  return (
    <header className="my-8 flex h-[2.25rem] w-full shrink-0 items-center justify-between gap-4 px-8">
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
    <PopupContent className="px-8">
      <LearnMoreContent
        onAddHardwareClick={goToAddHardwareAccounts}
        onCurrenciesClick={goToSettingsCurrency}
        onManageAccountsClick={goToSettingsAccounts}
        onMnemonicsClick={goToSettingsMnemonics}
      />
    </PopupContent>
  </PopupLayout>
)
