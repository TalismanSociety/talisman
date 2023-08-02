import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AccountCreate } from "@ui/domains/Account/AccountCreate"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
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
        className="flex flex-col"
        title={t("Add your first account")}
        onDoItLaterClick={handleDoItLaterClick}
      >
        <AccountCreate className="mt-0" />
      </OnboardDialog>
    </Layout>
  )
}
