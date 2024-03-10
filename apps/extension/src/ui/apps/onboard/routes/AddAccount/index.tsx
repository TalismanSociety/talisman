import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { useOnboard } from "@ui/apps/onboard/context"
import { OnboardLayout } from "@ui/apps/onboard/OnboardLayout"
import { AccountCreateMenu } from "@ui/domains/Account/AccountAdd"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useCallback, useEffect } from "react"
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
  const isLoggedIn = useIsLoggedIn()

  const handleDoItLaterClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add account - I'll do it later",
    })
    setOnboarded()
  }, [setOnboarded])

  useEffect(() => {
    if (!isLoggedIn) setOnboarded()
  }, [isLoggedIn, setOnboarded])

  return (
    <OnboardLayout withBack analytics={ANALYTICS_PAGE} className="min-h-[70rem] min-w-[68rem]">
      <OnboardDialog
        className="flex w-[68rem] flex-col"
        title={t("Add your first account")}
        onDoItLaterClick={handleDoItLaterClick}
      >
        <AccountCreateMenu className="mt-0" />
      </OnboardDialog>
    </OnboardLayout>
  )
}
