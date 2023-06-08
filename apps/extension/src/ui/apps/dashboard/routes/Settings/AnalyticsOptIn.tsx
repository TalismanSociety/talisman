import Field from "@talisman/components/Field"
import Setting from "@talisman/components/Setting"
import Layout from "@ui/apps/dashboard/layout"
import { AnalyticsOptInInfo } from "@ui/domains/Settings/Analytics/AnalyticsOptInInfo"
import { useSetting } from "@ui/hooks/useSettings"
import { useTranslation } from "react-i18next"
import { useNavigationType } from "react-router-dom"

export const AnalyticsOptIn = () => {
  const { t } = useTranslation("settings")
  const [useAnalyticsTracking, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")
  const nav = useNavigationType()

  return (
    <Layout centered withBack={nav === "PUSH"}>
      <AnalyticsOptInInfo>
        <Setting
          title={t("Opt in to collection of anonymised usage data")}
          subtitle={
            useAnalyticsTracking
              ? t("You are currently opted in")
              : t("You are currently opted out")
          }
        >
          <Field.Toggle value={useAnalyticsTracking} onChange={setUseAnalyticsTracking} />
        </Setting>
      </AnalyticsOptInInfo>
    </Layout>
  )
}
