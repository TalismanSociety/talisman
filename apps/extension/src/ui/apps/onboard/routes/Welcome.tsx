import { ArrowRightIcon } from "@talismn/icons"
import { useCallback, useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "@extension/shared"
import { TalismanWhiteLogo } from "@talisman/theme/logos"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"

import { useOnboard } from "../context"
import { OnboardLayout } from "../OnboardLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 5,
  page: "Onboarding - Step 1 - Welcome",
}

const handleLinkClick = (action: string) => () => {
  sendAnalyticsEvent({
    ...ANALYTICS_PAGE,
    name: "GotoExternal",
    action,
    site: "Talisman Docs",
  })
}

export const WelcomePage = () => {
  const { t } = useTranslation("onboard")
  useAnalyticsPageView(ANALYTICS_PAGE)
  const { reset, updateData, setStage } = useOnboard()
  const navigate = useNavigate()

  const handleNextClick = useCallback(
    () => async () => {
      reset()
      updateData({ mnemonic: undefined }) // always clear this one, even in dev mode
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: "Onboarding Welcome -> Password",
      })
      navigate("/password")
    },
    [navigate, reset, updateData]
  )

  useEffect(() => {
    setStage(0)
  }, [setStage])

  return (
    <OnboardLayout analytics={ANALYTICS_PAGE} className="min-h-[60rem] min-w-[54rem]">
      <div className="my-[8rem] flex flex-col items-center justify-center gap-32 ">
        <div className="welcome-text flex flex-col items-center gap-14 text-center xl:w-[76rem]">
          <div className="flex flex-col items-center gap-10 text-white xl:w-[65.2rem]">
            <TalismanWhiteLogo className="h-auto w-96" />
            <div className="font-whyteInkTrap text-[8rem] leading-none tracking-tight lg:text-[12rem]">
              <Trans
                t={t}
                defaults="Multi-chain made <YellowText>easy</YellowText>"
                components={{
                  YellowText: <span className="text-primary" />,
                }}
              />
            </div>
          </div>
          <div className="welcome-subtitle text-[2rem] lg:text-[2.8rem]">
            {t("Talisman supports Ethereum, Polkadot, and more")}
          </div>
        </div>
        <div className="welcome-button flex w-[44rem] flex-col gap-8">
          <Button
            primary
            icon={ArrowRightIcon}
            onClick={handleNextClick()}
            data-testid="onboarding-get-started-button"
          >
            {t("Get Started")}
          </Button>
          <div className="text-body-secondary text-center text-sm leading-[2rem]">
            <Trans t={t}>
              By continuing, you agree to the{" "}
              <a
                href={TERMS_OF_USE_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-body"
                onClick={handleLinkClick("Terms of Service")}
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={PRIVACY_POLICY_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-body"
                onClick={handleLinkClick("Privacy Policy")}
              >
                Privacy Policy
              </a>
            </Trans>
          </div>
        </div>
      </div>
    </OnboardLayout>
  )
}
