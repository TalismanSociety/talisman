import { Button } from "talisman-ui"

import imgHandOrb from "@talisman/theme/images/onboard_hand_orb.png"
import { AnalyticsPage } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"

import { useOnboard } from "../context"
import { OnboardLayout } from "../OnboardLayout"

const SUCCESS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 5,
  page: "Onboarding - Step 5 - Success",
}

export const SuccessPage = () => {
  useAnalyticsPageView(SUCCESS_PAGE)
  const { completeOnboarding } = useOnboard()
  return (
    <OnboardLayout analytics={SUCCESS_PAGE} className="min-h-[48rem] min-w-[59rem]">
      <div className="inline-flex w-[59rem] flex-col items-center justify-center gap-12 rounded-sm p-12">
        <div className="text-center text-lg">Welcome, brave Seeker!</div>
        <img src={imgHandOrb} className="w-[23rem]" alt="Talisman Hand Logo" />
        <div className="text-body-secondary text-center">
          Your wallet has been forged in the fires of Talisman.
          <br />
          You're ready to get started!
        </div>
        <Button primary onClick={completeOnboarding} data-testid="onboarding-enter-talisman-button">
          Enter Talisman
        </Button>
      </div>
    </OnboardLayout>
  )
}
