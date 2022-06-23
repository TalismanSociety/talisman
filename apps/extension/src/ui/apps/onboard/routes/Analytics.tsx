import { appStore } from "@core/domains/app/store.app"
import { settingsStore } from "@core/domains/app/store.settings"
import { ButtonGroup } from "@talisman/components/Button"
import { SimpleButton } from "@talisman/components/SimpleButton"
import OnboardingImg from "@talisman/theme/images/onboard_analytics.png"
import { AnalyticsOptInInfo } from "@ui/domains/Settings/Analytics/AnalyticsOptInInfo"
import { motion } from "framer-motion"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { Layout } from "../layout"

const Image = styled(motion.img)`
  // force size to avoid page layout shift on load
  height: 55rem;
  width: 55.28rem;

  @media (max-width: 1146px) {
    height: calc(0.75 * 55rem);
    width: calc(0.75 * 55.28rem);
  }
`

const SpreadButtonGroup = styled(ButtonGroup)`
  justify-content: space-around;
`

const BtnProceed = styled(SimpleButton)`
  width: 19.8rem;
  display: inline-block;
`

export const Analytics = () => {
  const navigate = useNavigate()

  const setUseAnalyticsTracking = useCallback(
    async (useAnalyticsTracking: boolean) => {
      await settingsStore.set({ useAnalyticsTracking })
      await appStore.set({ analyticsRequestShown: true })
      navigate("/complete")
    },
    [navigate]
  )

  return (
    <Layout picture={<Image src={OnboardingImg} />}>
      <AnalyticsOptInInfo>
        <SpreadButtonGroup>
          <BtnProceed
            tabIndex={4}
            className="btn-reject"
            onClick={() => setUseAnalyticsTracking(false)}
          >
            No thanks
          </BtnProceed>
          <BtnProceed
            tabIndex={3}
            className="btn-agree"
            primary
            onClick={() => setUseAnalyticsTracking(true)}
          >
            I agree
          </BtnProceed>
        </SpreadButtonGroup>
      </AnalyticsOptInInfo>
    </Layout>
  )
}
