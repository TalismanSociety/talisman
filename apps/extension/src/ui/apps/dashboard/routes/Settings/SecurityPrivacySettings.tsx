import Field from "@talisman/components/Field"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Setting from "@talisman/components/Setting"
import Spacer from "@talisman/components/Spacer"
import Layout from "@ui/apps/dashboard/layout"
import { useSettings } from "@ui/hooks/useSettings"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

const LinkText = styled.span`
  color: var(--color-primary);
  cursor: pointer;
`

const TSLink = styled.a`
  color: var(--color-primary);
`

const SecurityPrivacySettings = () => {
  const { useAnalyticsTracking, useErrorTracking, update } = useSettings()
  const navigate = useNavigate()
  return (
    <Layout centered withBack backTo="/settings">
      <HeaderBlock title="Security and Privacy" text="Control security and privacy preferences" />
      <Spacer />
      <Grid columns={1}>
        {useErrorTracking !== undefined && (
          <Setting
            title="Error Reporting"
            subtitle={
              <>
                Send anonymised error reports to Talisman (via{" "}
                <TSLink href="https://www.sentry.io" target="_blank" rel="noreferrer">
                  {" "}
                  Sentry
                </TSLink>
                )
              </>
            }
          >
            <Field.Toggle
              value={useErrorTracking}
              onChange={(val: boolean) => update({ useErrorTracking: val })}
            />
          </Setting>
        )}
        {useAnalyticsTracking !== undefined && (
          <Setting
            title="Analytics"
            subtitle={
              <>
                Opt in to collection of anonymised usage data.{" "}
                <LinkText onClick={() => navigate("/settings/analytics")}>Learn More</LinkText>
              </>
            }
          >
            <Field.Toggle
              value={useAnalyticsTracking}
              onChange={(val: boolean) => update({ useAnalyticsTracking: val })}
            />
          </Setting>
        )}
      </Grid>
    </Layout>
  )
}

export default SecurityPrivacySettings
