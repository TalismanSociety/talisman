import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { AnalyticsPage } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"

import { ReactComponent as ImgSuccess } from "../assets/success.svg"
import { useOnboard } from "../context"
import { OnboardLayout } from "../OnboardLayout"

const SUCCESS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 5,
  page: "Onboarding - Step 5 - Success",
}

export const SuccessPage = () => {
  const { t } = useTranslation()
  useAnalyticsPageView(SUCCESS_PAGE)
  const { completeOnboarding } = useOnboard()

  return (
    <OnboardLayout analytics={SUCCESS_PAGE} className="min-h-[48rem] min-w-[59rem]">
      <div className="flex w-[36.9rem] flex-col items-center justify-center gap-12 p-12">
        <div className="whitespace-nowrap text-center text-lg uppercase">
          {t("Welcome, brave Seeker!")}
        </div>
        <ImgSuccess className="h-[16.6rem] w-[24.9rem]" />
        <div className="text-body-secondary text-center">
          {t("Your wallet has been forged in the fires of Talisman.")}
        </div>
        <Button primary onClick={completeOnboarding}>
          {t("Go to Portfolio")}
        </Button>
      </div>
    </OnboardLayout>
  )
}
