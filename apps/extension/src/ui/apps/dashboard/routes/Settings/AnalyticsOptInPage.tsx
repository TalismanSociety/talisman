import { useTranslation } from "react-i18next"
import { useNavigationType } from "react-router-dom"
import { Toggle } from "talisman-ui"

import { Setting } from "@talisman/components/Setting"
import { AnalyticsOptInInfo } from "@ui/domains/Settings/Analytics/AnalyticsOptInInfo"
import { useSetting } from "@ui/hooks/useSettings"

import { DashboardAdminLayout } from "../../layout/Admin/DashboardAdminLayout"

export const AnalyticsOptInPage = () => {
  const { t } = useTranslation("admin")
  const [useAnalyticsTracking, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")
  const nav = useNavigationType()

  return (
    <DashboardAdminLayout centered withBack={nav === "PUSH"}>
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
    </DashboardAdminLayout>
  )
}
