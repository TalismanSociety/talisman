import { SimpleButton } from "@talisman/components/SimpleButton"
import imgAnalytics from "@talisman/theme/images/analytics.png"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { Navigate, useNavigate } from "react-router-dom"
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
  featureVersion: 4,
  page: "Onboarding - Step 3 - Manage your privacy",
}

export const PrivacyPage = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)

  const { updateData, data } = useOnboard()
  const navigate = useNavigate()

  const handleClick = useCallback(
    (allowTracking: boolean) => () => {
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: `Manage your privacy - ${allowTracking ? "I agree" : "No thanks"}`,
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
      action: "Learn more about privacy",
      site: "Talisman Docs",
    })
  }, [])

  // if user refreshes the page, context data is lost
  if (!data?.password) return <Navigate to="/" replace />

  return (
    <Container
      withBack
      picture={<Picture src={imgAnalytics} alt="Analytics" />}
      analytics={ANALYTICS_PAGE}
    >
      <Dialog title="Manage your privacy">
        <p className="mt-16">
          To help improve Talisman we’d like to collect anonymous usage information and send
          anonymized error reports. We respect your data and never record sensitive or identifying
          information. You can always adjust these settings, or opt out completely at any time.
          <br />
          <br />
          <a
            onClick={handleLearnMoreClick}
            href="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
            target="_blank"
          >
            Learn more
          </a>{" "}
          about what we track and how we use this data.
        </p>
        <div className="mt-24 flex w-full gap-8">
          <SimpleButtonTransparent onClick={handleClick(false)}>No thanks</SimpleButtonTransparent>
          <SimpleButton onClick={handleClick(true)} primary>
            I agree
          </SimpleButton>
        </div>
      </Dialog>
    </Container>
  )
}
