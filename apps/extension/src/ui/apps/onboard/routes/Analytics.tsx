import { appStore } from "@core/domains/app/store.app"
import { settingsStore } from "@core/domains/app/store.settings"
import { ButtonGroup } from "@talisman/components/Button"
import { SimpleButton } from "@talisman/components/SimpleButton"
import OnboardingImg from "@talisman/theme/images/onboard_analytics.png"
import { AnalyticsOptInInfo } from "@ui/domains/Settings/Analytics/AnalyticsOptInInfo"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import { Layout } from "../layout"

const Image = styled(motion.img)`
  // force size to avoid page layout shift on load
  height: 45rem;
  width: 38.82225rem;

  @media (max-width: 1146px) {
    height: calc(0.75 * 60rem);
    width: calc(0.75 * 51.763rem);
  }
`

const SpreadButtonGroup = styled(ButtonGroup)`
  justify-content: space-around;
`

const BtnProceed = styled(SimpleButton)`
  width: 19.8rem;
  display: inline-block;
`

export const Analytics = ({ nextUrl }: { nextUrl: string }) => {
  const navigate = useNavigate()
  return (
    <Layout picture={<Image src={OnboardingImg} />}>
      <AnalyticsOptInInfo>
        <SpreadButtonGroup>
          <BtnProceed
            tabIndex={4}
            className="btn-reject"
            onClick={async () => {
              await settingsStore.set({ useAnalyticsTracking: false })
              await appStore.set({ analyticsRequestShown: true })
              navigate(nextUrl)
            }}
          >
            No thanks
          </BtnProceed>
          <BtnProceed
            tabIndex={3}
            className="btn-agree"
            primary
            onClick={async () => {
              await settingsStore.set({ useAnalyticsTracking: true })
              await appStore.set({ analyticsRequestShown: true })
              navigate(nextUrl)
            }}
          >
            I agree
          </BtnProceed>
        </SpreadButtonGroup>
      </AnalyticsOptInInfo>
    </Layout>
  )
}
