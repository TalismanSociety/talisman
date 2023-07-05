import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Setting from "@talisman/components/Setting"
import Spacer from "@talisman/components/Spacer"
import { useSetting } from "@ui/hooks/useSettings"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import { Toggle } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

const LinkText = styled.span`
  color: var(--color-primary);
  cursor: pointer;
`

const TSLink = styled.a`
  color: var(--color-primary);
`

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
      <Spacer />
      <Grid columns={1}>
        {useErrorTracking !== undefined && (
          <Setting
            title={t("Error Reporting")}
            subtitle={
              <Trans t={t}>
                Send anonymised error reports to Talisman (via{" "}
                <TSLink href="https://www.sentry.io" target="_blank" rel="noreferrer">
                  {" "}
                  Sentry
                </TSLink>
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
                <LinkText onClick={() => navigate("/settings/analytics")}>Learn More</LinkText>
              </Trans>
            }
          >
            <Toggle
              checked={useAnalyticsTracking}
              onChange={(e) => setUseAnalyticsTracking(e.target.checked)}
            />
          </Setting>
        )}
      </Grid>
    </DashboardLayout>
  )
}
