import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { OnboardDialog } from "../components/OnboardDialog"
import { useOnboard } from "../context"
import { Layout } from "../layout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 5,
  page: "Onboarding - Step 4 - Add account",
}

export const AddAccountPage = () => {
  const { t } = useTranslation("onboard")
  useAnalyticsPageView(ANALYTICS_PAGE)
  const { setOnboarded } = useOnboard()

  // if user refreshes the page, context data is lost
  // if (!data?.password) return <Navigate to="/" replace /> TODO re-enable this
  const navigate = useNavigate()

  const handleDoItLaterClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add account - I'll do it later",
    })
    setOnboarded()
    navigate("/success")
  }, [navigate, setOnboarded])

  return (
    <Layout withBack analytics={ANALYTICS_PAGE}>
      <OnboardDialog
        className="flex w-[64rem] flex-col items-center gap-12"
        title={t("Add your first account")}
        onDoItLaterClick={handleDoItLaterClick}
      >
        <Trans t={t}>You can also do this later</Trans>
        <div className="mt-40 flex w-full gap-8">Account buttons here</div>
      </OnboardDialog>
    </Layout>
  )
}
