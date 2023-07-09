import { Setting } from "@talisman/components/Setting"
import { AnalyticsOptInInfo } from "@ui/domains/Settings/Analytics/AnalyticsOptInInfo"
import { useSetting } from "@ui/hooks/useSettings"
import { useTranslation } from "react-i18next"
import { useNavigationType } from "react-router-dom"
import { Toggle } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const AnalyticsOptInPage = () => {
  const { t } = useTranslation("admin")
  const [useAnalyticsTracking, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")
  const nav = useNavigationType()

  return (
    <DashboardLayout centered withBack={nav === "PUSH"}>
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
    </DashboardLayout>
  )
}
