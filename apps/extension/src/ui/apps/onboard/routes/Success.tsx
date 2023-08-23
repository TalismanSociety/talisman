import imgHandOrb from "@talisman/theme/images/onboard_hand_orb.png"
import { AnalyticsPage } from "@ui/api/analytics"
import { Button } from "talisman-ui"

import { useOnboard } from "../context"
import { Layout } from "../layout"

const SUCCESS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 5,
  page: "Onboarding - Step 5 - Success",
}

export const SuccessPage = () => {
  const { completeOnboarding } = useOnboard()
  return (
    <Layout analytics={SUCCESS_PAGE}>
      <div className="inline-flex w-[59rem] flex-col items-center justify-center gap-12 rounded-sm p-12">
        <div className="text-center text-lg">Welcome, brave Seeker!</div>
        <img src={imgHandOrb} className="w-[23rem]" alt="Talisman Hand Logo" />
        <div className="text-body-secondary text-center">
          Your account has been forged in the fires of Talisman. Let the winds of destiny guide you
          through the Paraverse.
        </div>
        <Button primary onClick={completeOnboarding}>
          Enter Talisman
        </Button>
      </div>
    </Layout>
  )
}
