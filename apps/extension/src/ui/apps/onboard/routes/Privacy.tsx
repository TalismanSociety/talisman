import { Box } from "@talisman/components/Box"
import { SimpleButton } from "@talisman/components/SimpleButton"
import imgAnalytics from "@talisman/theme/images/analytics.png"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { OnboardDialog } from "../components/OnboardDialog"
import { useOnboard } from "../context"
import { Layout } from "../layout"

const Container = styled(Layout)`
  background: rgb(131, 58, 180);
  background: linear-gradient(
    20deg,
    var(--color-background) 0%,
    rgba(186, 132, 255, 0.3) 50%,
    rgba(244, 143, 69, 0.3) 100%
  );

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

export const PrivacyPage = () => {
  const { updateData } = useOnboard()
  const navigate = useNavigate()

  const handleClick = useCallback(
    (allowLogging: boolean) => () => {
      updateData({ allowLogging })
      navigate("/onboard")
    },
    [navigate, updateData]
  )

  return (
    <Container withBack picture={<Picture src={imgAnalytics} alt="Analytics" />}>
      <Dialog title="Manage your privacy">
        <Box margin="4.8rem 0" lineheightcustom={2.2}>
          To help improve Talisman we’d like to collect anonymous usage information and send
          anonymized error reports. We respect your data and never record sensitive or identifying
          information. You can always adjust these settings, or opt out completely at any time.
          <br />
          <br />
          <a href="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy">
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
