import { useTranslation } from "react-i18next"
import { Toggle } from "talisman-ui"

import { Setting } from "@talisman/components/Setting"
import { AnalyticsOptInInfo } from "@ui/domains/Settings/Analytics/AnalyticsOptInInfo"
import { useSetting } from "@ui/state"

import { DashboardLayout } from "../../layout"

const Content = () => {
  const { t } = useTranslation("admin")
  const [useAnalyticsTracking, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")

  return (
    <>
      <AnalyticsOptInInfo>
        <Setting
          title={t("Opt in to collection of anonymised usage data")}
          subtitle={
            useAnalyticsTracking
              ? t("You are currently opted in")
              : t("You are currently opted out")
          }
        >
          <Toggle
            checked={useAnalyticsTracking}
            onChange={(e) => setUseAnalyticsTracking(e.target.checked)}
          />
        </Setting>
      </AnalyticsOptInInfo>
    </>
  )
}

export const AnalyticsOptInPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
