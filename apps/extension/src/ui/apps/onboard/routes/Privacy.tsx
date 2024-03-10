import { PRIVACY_POLICY_URL } from "@extension/shared"
import imgAnalyticsFlower from "@talisman/theme/images/onboard_analytics_flower.png"
import imgAnalyticsSwitch from "@talisman/theme/images/onboard_analytics_switch.png"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { OnboardDialog } from "../components/OnboardDialog"
import { useOnboard } from "../context"
import { OnboardLayout } from "../OnboardLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 5,
  page: "Onboarding - Step 3 - Manage your privacy",
}

export const PrivacyPage = () => {
  const { t } = useTranslation("onboard")
  useAnalyticsPageView(ANALYTICS_PAGE)

  const { updateData, setOnboarded } = useOnboard()
  const navigate = useNavigate()
  const isLoggedIn = useIsLoggedIn()

  const handleClick = useCallback(
    (allowTracking: boolean) => () => {
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: `Manage your privacy - ${allowTracking ? "I agree" : "No thanks"}`,
      })
      updateData({ allowTracking })
      isLoggedIn ? navigate("/accounts/add") : setOnboarded()
    },
    [navigate, updateData, isLoggedIn, setOnboarded]
  )

  const handleLearnMoreClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "GotoExternal",
      action: "Learn more about privacy",
      site: "Talisman Docs",
    })
  }, [])

  return (
    <OnboardLayout withBack analytics={ANALYTICS_PAGE} className="min-h-[55rem] min-w-[60rem]">
      <img src={imgAnalyticsSwitch} className="fixed left-80 top-80" alt="" />
      <img src={imgAnalyticsFlower} className="fixed bottom-32 right-10" alt="" />
      <OnboardDialog title={t("Manage your privacy")}>
        <Trans t={t}>
          <div className="flex flex-col gap-8">
            <p>
              To help improve Talisman we’d like to collect anonymous usage information and send
              anonymized error reports.
            </p>
            <p>
              We respect your data and never record sensitive or identifying information. You can
              always adjust these settings, or opt out completely at any time.
            </p>
            <p>
              <a
                onClick={handleLearnMoreClick}
                className="text-body"
                href={PRIVACY_POLICY_URL}
                target="_blank"
              >
                Learn more
              </a>{" "}
              about what we track and how we use this data.
            </p>
          </div>
        </Trans>
        <div className="mt-40 flex w-full gap-8">
          <Button className="bg-transparent" fullWidth onClick={handleClick(false)}>
            {t("No thanks")}
          </Button>
          <Button onClick={handleClick(true)} fullWidth primary>
            {t("I agree")}
          </Button>
        </div>
      </OnboardDialog>
    </OnboardLayout>
  )
}
