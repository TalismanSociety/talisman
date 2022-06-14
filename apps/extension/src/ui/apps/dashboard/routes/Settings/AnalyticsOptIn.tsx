import Field from "@talisman/components/Field"
import Setting from "@talisman/components/Setting"
import Layout from "@ui/apps/dashboard/layout"
import { AnalyticsOptInInfo } from "@ui/domains/Settings/Analytics/AnalyticsOptInInfo"
import { useSettings } from "@ui/hooks/useSettings"
import { useNavigationType } from "react-router-dom"

export const AnalyticsOptIn = () => {
  const { useAnalyticsTracking, update } = useSettings()
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
          <Field.Toggle
            value={useAnalyticsTracking}
            onChange={(val: boolean) => update({ useAnalyticsTracking: val })}
          />
        </Setting>
      </AnalyticsOptInInfo>
    </Layout>
  )
}
