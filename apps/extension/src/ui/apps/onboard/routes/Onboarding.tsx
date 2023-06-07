import { AnalyticsPage } from "@ui/api/analytics"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

import { OnboardDialog } from "../components/OnboardDialog"
import { OnboardLoader } from "../components/OnboardLoader"
import { useOnboard } from "../context"
import { Layout } from "../layout"

const Container = styled(Layout)`
  ${OnboardLoader} {
    margin-top: 7.2rem;
    margin-bottom: 2.4rem;
    font-size: 14rem;
    color: var(--color-foreground);
  }
`

const Dialog = styled(OnboardDialog)`
  text-align: center;
`

const ErrorMessage = styled.div`
  margin-top: 3.2rem;
  color: var(--color-status-error);
`

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 4,
  page: "Onboarding - Step 4 - Creating your wallet spinner",
}

export const OnboardingPage = () => {
  const [error, setError] = useState<string>()
  const { data, onboard } = useOnboard()

  const processOnboard = useCallback(async () => {
    try {
      await onboard()
    } catch (err) {
      setError((err as Error).message)
    }
  }, [onboard])

  useEffect(() => {
    const timeout = setTimeout(processOnboard, 1500)

    return () => {
      clearTimeout(timeout)
    }
  }, [processOnboard])

  const { t } = useTranslation("onboard")
  const title = useMemo(
    () =>
      data.importMethodType === "mnemonic" ? t("Importing wallet...") : t("Setting up Talisman..."),
    [data.importMethodType, t]
  )

  return (
    <Container analytics={ANALYTICS_PAGE}>
      <div className="flex justify-center">
        <div className="w-[60rem]">
          <Dialog title={title}>
            <OnboardLoader />
            <ErrorMessage>{error}</ErrorMessage>
          </Dialog>
        </div>
      </div>
    </Container>
  )
}
