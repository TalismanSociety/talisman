import { Box } from "@talisman/components/Box"
import { AnalyticsPage } from "@ui/api/analytics"
import { useCallback, useEffect, useState } from "react"
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
  const { onboard } = useOnboard()

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

  return (
    <Container analytics={ANALYTICS_PAGE}>
      <Box flex justify="center">
        <Box w={60}>
          <Dialog title="Creating your wallet">
            <OnboardLoader />
            <ErrorMessage>{error}</ErrorMessage>
          </Dialog>
        </Box>
      </Box>
    </Container>
  )
}
