import Field from "@talisman/components/Field"
import Setting from "@talisman/components/Setting"
import Layout from "@ui/apps/dashboard/layout"
import { AnalyticsOptInInfo } from "@ui/domains/Settings/Analytics/AnalyticsOptInInfo"
import { useSetting } from "@ui/hooks/useSettings"
import { useNavigationType } from "react-router-dom"

export const AnalyticsOptIn = () => {
  const [useAnalyticsTracking, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")
  const nav = useNavigationType()

  return (
    <Layout centered withBack={nav === "PUSH"}>
      <AnalyticsOptInInfo>
        <Setting
          title="Opt in to collection of anonymised usage data"
          subtitle={
            useAnalyticsTracking ? "You are currently opted in" : "You are currently opted out"
          }
        >
          <Field.Toggle value={useAnalyticsTracking} onChange={setUseAnalyticsTracking} />
        </Setting>
      </AnalyticsOptInInfo>
    </Layout>
  )
}
