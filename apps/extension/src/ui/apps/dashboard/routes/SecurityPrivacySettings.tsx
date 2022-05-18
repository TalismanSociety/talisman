import { useState, useEffect } from "react"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import Grid from "@talisman/components/Grid"
import Field from "@talisman/components/Field"
import Setting from "@talisman/components/Setting"
import Layout from "../layout"
import { settingsStore } from "@core/domains/app"
import styled from "styled-components"

const TSLink = styled.a`
  color: var(--color-primary);
`

const SecurityPrivacySettings = () => {
  const [useErrorTracking, setUseErrorTracking] = useState<boolean | undefined>()

  useEffect(() => {
    const sub = settingsStore.observable.subscribe((settings) =>
      setUseErrorTracking(settings.useErrorTracking)
    )
    return () => sub.unsubscribe()
  }, [])

  return (
    <Layout centered withBack>
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
              onChange={(val: boolean) => settingsStore.set({ useErrorTracking: val })}
            />
          </Setting>
        )}
      </Grid>
    </Layout>
  )
}

export default SecurityPrivacySettings
