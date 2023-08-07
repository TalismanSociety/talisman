import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { useOnboard } from "@ui/apps/onboard/context"
import { Layout } from "@ui/apps/onboard/layout"
import { AccountCreateMenu } from "@ui/domains/Account/AccountCreate"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

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

  const handleDoItLaterClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add account - I'll do it later",
    })
    setOnboarded()
  }, [setOnboarded])

  return (
    <Layout withBack analytics={ANALYTICS_PAGE}>
      <OnboardDialog
        className="flex w-[68rem] flex-col"
        title={t("Add your first account")}
        onDoItLaterClick={handleDoItLaterClick}
      >
        <AccountCreateMenu className="mt-0" />
      </OnboardDialog>
    </Layout>
  )
}
