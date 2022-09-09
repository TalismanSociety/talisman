import { Box } from "@talisman/components/Box"
import { SimpleButton } from "@talisman/components/SimpleButton"
import imgAnalytics from "@talisman/theme/images/analytics.png"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { OnboardDialog } from "../components/OnboardDialog"
import { useOnboard } from "../context"
import { Layout } from "../layout"

const Container = styled(Layout)`
  > section > .hflex > .picture {
    width: auto;
  }

  > section > .hflex > .content {
    width: 59.2rem;
  }

  a {
    color: var(--color-foreground);
  }
`

const SimpleButtonTransparent = styled(SimpleButton)`
  background: transparent;
`

const Dialog = styled(OnboardDialog)`
  width: 59.2rem;
`

const Picture = styled.img`
  width: 53.7rem;
`

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 3,
  page: "Manage your privacy",
}

export const PrivacyPage = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)

  const { updateData } = useOnboard()
  const navigate = useNavigate()

  const handleClick = useCallback(
    (allowTracking: boolean) => () => {
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: allowTracking ? "No thanks" : "I agree",
      })
      updateData({ allowTracking })
      navigate("/onboard")
    },
    [navigate, updateData]
  )

  const handleLearnMoreClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "GotoExternal",
      action: "Learn more",
    })
  }, [])

  return (
    <Container
      withBack
      picture={<Picture src={imgAnalytics} alt="Analytics" />}
      analytics={ANALYTICS_PAGE}
    >
      <Dialog title="Manage your privacy">
        <Box margin="4.8rem 0" lineheightcustom={2.2}>
          To help improve Talisman we’d like to collect anonymous usage information and send
          anonymized error reports. We respect your data and never record sensitive or identifying
          information. You can always adjust these settings, or opt out completely at any time.
          <br />
          <br />
          <a
            onClick={handleLearnMoreClick}
            href="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
          >
            Learn more
          </a>{" "}
          about what we track and how we use this data.
        </Box>
        <Box flex fullwidth gap={1.6}>
          <SimpleButtonTransparent onClick={handleClick(false)}>No thanks</SimpleButtonTransparent>
          <SimpleButton onClick={handleClick(true)} primary>
            I agree
          </SimpleButton>
        </Box>
      </Dialog>
    </Container>
  )
}
