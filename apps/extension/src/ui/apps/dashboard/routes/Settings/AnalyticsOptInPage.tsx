import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { Setting } from "@ui/components/Setting"
import { Toggle } from "@ui/components/Toggle"
import { AnalyticsOptInInfo } from "@ui/domains/Settings/Analytics/AnalyticsOptInInfo"
import { useSetting } from "@ui/state/settings"
import { useTranslation } from "react-i18next"

const Content = () => {
  const { t } = useTranslation()
  const [useAnalyticsTracking, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")

  return (
    <AnalyticsOptInInfo>
      <Setting
        title={t("Opt in to collection of anonymised usage data")}
        subtitle={
          useAnalyticsTracking ? t("You are currently opted in") : t("You are currently opted out")
        }
      >
        <Toggle
          checked={useAnalyticsTracking}
          onChange={(e) => setUseAnalyticsTracking(e.target.checked)}
        />
      </Setting>
    </AnalyticsOptInInfo>
  )
}

export const AnalyticsOptInPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
