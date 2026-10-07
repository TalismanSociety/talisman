import { PRIVACY_POLICY_URL } from "@common/constants"
import { Button } from "@ui/components/Button"
import imgAnalyticsFlower from "@ui/theme/images/onboard_analytics_flower.png"
import imgAnalyticsSwitch from "@ui/theme/images/onboard_analytics_switch.png"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"

import { OnboardDialog } from "../components/OnboardDialog"
import { useOnboard } from "../context"
import { OnboardLayout } from "../OnboardLayout"

export const PrivacyPage = () => {
  const { t } = useTranslation()

  const { updateData, setOnboarded } = useOnboard()

  const handleClick = useCallback(
    (allowTracking: boolean) => () => {
      updateData({ allowTracking })
      setOnboarded()
    },
    [updateData, setOnboarded]
  )

  return (
    <OnboardLayout withBack className="min-h-137.5 min-w-150">
      <img src={imgAnalyticsSwitch} className="fixed top-80 left-80" alt="" />
      <img src={imgAnalyticsFlower} className="fixed right-10 bottom-32" alt="" />
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
              Read our{" "}
              <a className="text-body" href={PRIVACY_POLICY_URL} target="_blank" rel="noopener">
                Privacy Policy
              </a>{" "}
              to learn more about what we track and how we use this data.
            </p>
          </div>
        </Trans>
        <div className="mt-40 flex w-full gap-8">
          <Button className="bg-transparent" fullWidth onClick={handleClick(false)}>
            {t("No thanks")}
          </Button>
          <Button
            onClick={handleClick(true)}
            fullWidth
            primary
            data-testid="onboarding-privacy-accept-button"
          >
            {t("I agree")}
          </Button>
        </div>
      </OnboardDialog>
    </OnboardLayout>
  )
}
