import { Box } from "@talisman/components/Box"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"

import { OnboardDialog } from "../components/OnboardDialog"
import { OnboardLoader } from "../components/OnboardLoader"
import { useOnboard } from "../context"
import { Layout } from "../layout"

const Container = styled(Layout)`
  ${OnboardLoader} {
    font-size: 20rem;
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
  }, [onboard, processOnboard])

  return (
    <Container withBack>
      <Box flex justify="center">
        <Box w={60}>
          <Dialog title="Creating your accounts">
            <OnboardLoader />
            <ErrorMessage>{error}</ErrorMessage>
          </Dialog>
        </Box>
      </Box>
    </Container>
  )
}
