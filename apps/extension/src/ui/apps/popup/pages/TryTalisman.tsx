import { ChevronLeftIcon } from "@talismn/icons"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { TryTalismanContent } from "@ui/domains/Portfolio/GetStarted/TryTalisman/TryTalismanContent"

import { PopupContent, PopupLayout } from "../Layout/PopupLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Try Talisman",
}

const Header = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goToPortfolio = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Portfolio (back)" })
    return navigate("/portfolio")
  }, [navigate])

  return (
    <header className="my-8 flex h-[3.6rem] w-full shrink-0 items-center justify-between gap-4 px-8">
      <div className="flex-1">
        <IconButton onClick={goToPortfolio}>
          <ChevronLeftIcon />
        </IconButton>
      </div>
      <div className="font-bold">
        <Trans t={t}>
          Try <span className="text-primary">Talisman</span>
        </Trans>
      </div>
      <div className="flex-1 text-right">
        <span />
      </div>
    </header>
  )
}

export const TryTalismanPage = () => (
  <PopupLayout>
    <Header />
    <PopupContent>
      <TryTalismanContent analytics={ANALYTICS_PAGE} />
    </PopupContent>
  </PopupLayout>
)
