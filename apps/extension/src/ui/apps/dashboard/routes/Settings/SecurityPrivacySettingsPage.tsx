import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Setting } from "@talisman/components/Setting"
import { useSetting } from "@ui/hooks/useSettings"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Toggle } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const SecurityPrivacySettingsPage = () => {
  const { t } = useTranslation("admin")
  const [useAnalyticsTracking, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")
  const [useErrorTracking, setUseErrorTracking] = useSetting("useErrorTracking")
  const navigate = useNavigate()
  return (
    <DashboardLayout centered withBack backTo="/settings">
      <HeaderBlock
        title={t("Security and Privacy")}
        text={t("Control security and privacy preferences")}
      />
      <div className="mt-16 flex flex-col gap-12">
        {useErrorTracking !== undefined && (
          <Setting
            title={t("Error Reporting")}
            subtitle={
              <Trans t={t}>
                Send anonymised error reports to Talisman (via{" "}
                <a
                  className="text-primary-700 hover:text-primary"
                  href="https://www.sentry.io"
                  target="_blank"
                  rel="noreferrer"
                >
                  Sentry
                </a>
                )
              </Trans>
            }
          >
            <Toggle
              checked={useErrorTracking}
              onChange={(e) => setUseErrorTracking(e.target.checked)}
            />
          </Setting>
        )}
        {useAnalyticsTracking !== undefined && (
          <Setting
            title={t("Analytics")}
            subtitle={
              <Trans t={t}>
                Opt in to collection of anonymised usage data.{" "}
                <button
                  type="button"
                  className="text-primary-700 hover:text-primary"
                  onClick={() => navigate("/settings/analytics")}
                >
                  Learn More
                </button>
              </Trans>
            }
          >
            <Toggle
              checked={useAnalyticsTracking}
              onChange={(e) => setUseAnalyticsTracking(e.target.checked)}
            />
          </Setting>
        )}
      </div>
    </DashboardLayout>
  )
}
