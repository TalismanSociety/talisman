import { ChevronLeftIcon } from "@talismn/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import HeroUrl from "./PortfolioWhatsNewHero.png"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "What's New",
}

/**
 * This number should be incremented when we want to show the `What's New` banner
 * to users who have dismissed it in the past.
 *
 * E.g. when we have new features to tell them about.
 */
export const WhatsNewVersion = 1

export const PortfolioWhatsNew = () => {
  const { t } = useTranslation()

  return (
    <div className="text-body-secondary flex flex-col gap-12 text-sm">
      <img className="pointer-events-none w-full rounded-sm" src={HeroUrl} alt="a hero banner" />
      <div>
        <Trans t={t}>
          <span className="text-body">💹 Real-Time Price Tracking:</span> Stay updated with live
          crypto prices
        </Trans>
      </div>
      <div>
        <Trans t={t}>
          <span className="text-body">🔄 Simplified Swaps:</span> Exchange crypto faster with our
          streamlined swap interface
        </Trans>
      </div>
      <div>
        <Trans t={t}>
          <span className="text-body">👀 Invisible Mode:</span> Toggle on to hide your balances for
          added privacy
        </Trans>
      </div>
    </div>
  )
}

export const PortfolioWhatsNewHeader = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dismissedVersion, setDismissedVersion] = useSetting("newFeaturesDismissed")

  const goToPortfolio = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Portfolio" })
    return navigate("/portfolio")
  }, [navigate])

  const dismiss = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Interact", action: "Dismiss What's New" })
    setDismissedVersion(WhatsNewVersion)

    goToPortfolio()
  }, [goToPortfolio, setDismissedVersion])

  return (
    <header className="my-8 flex h-[3.6rem] w-full shrink-0 items-center justify-between gap-4 px-12">
      <div className="flex-1">
        <button type="button" className="p-6" onClick={goToPortfolio}>
          <ChevronLeftIcon />
        </button>
      </div>
      <div className="font-bold">
        <Trans t={t}>
          What's <span className="text-primary">New</span>
        </Trans>
      </div>
      <div className="flex-1 text-right">
        {dismissedVersion >= WhatsNewVersion ? (
          <span />
        ) : (
          <button
            type="button"
            className="bg-grey-800 text-tiny hover:bg-grey-750 focus:bg-grey-750 rounded-sm p-4 text-white"
            onClick={dismiss}
          >
            {t("Dismiss")}
          </button>
        )}
      </div>
    </header>
  )
}
