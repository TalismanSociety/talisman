// import imgAnalytics from "@talisman/theme/images/analytics.png"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { OnboardDialog } from "../components/OnboardDialog"
import { useOnboard } from "../context"
import { Layout } from "../layout"

// const Container = styled(Layout)`
//   > section > .hflex > .picture {
//     width: auto;
//   }

//   > section > .hflex > .content {
//     width: 59.2rem;
//   }

//   a {
//     color: var(--color-foreground);
//   }
// `

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 4,
  page: "Onboarding - Step 3 - Manage your privacy",
}

export const PrivacyPage = () => {
  const { t } = useTranslation("onboard")
  useAnalyticsPageView(ANALYTICS_PAGE)

  const { updateData } = useOnboard()
  const navigate = useNavigate()

  const handleClick = useCallback(
    (allowTracking: boolean) => () => {
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: `Manage your privacy - ${allowTracking ? "I agree" : "No thanks"}`,
      })
      updateData({ allowTracking })
      navigate("/onboard")
    },
    [navigate, updateData]
  )

  const handleLearnMoreClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "GotoExternal",
      action: "Learn more about privacy",
      site: "Talisman Docs",
    })
  }, [])

  // if user refreshes the page, context data is lost
  // if (!data?.password) return <Navigate to="/" replace />

  return (
    <Layout
      withBack
      // picture={<img className="w-[54rem]" src={imgAnalytics} alt="Analytics" />}
      analytics={ANALYTICS_PAGE}
    >
      <OnboardDialog title={t("Manage your privacy")}>
        <Trans t={t} className="mt-8 flex gap-8">
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
              href="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
              target="_blank"
            >
              Learn more
            </a>{" "}
            about what we track and how we use this data.
          </p>
        </Trans>
        <div className="mt-24 flex w-full gap-8">
          <Button className="bg-transparent" onClick={handleClick(false)}>
            {t("No thanks")}
          </Button>
          <Button onClick={handleClick(true)} primary>
            {t("I agree")}
          </Button>
        </div>
      </OnboardDialog>
    </Layout>
  )
}
