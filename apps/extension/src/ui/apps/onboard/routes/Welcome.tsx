import { ArrowRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "extension-shared"
import { FC, useCallback, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { TalismanColouredHandWhiteTextLogo } from "@talisman/theme/logos"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"

import logoBase from "../assets/base.svg?url"
import logoBittensor from "../assets/bittensor.svg?url"
import logoMainnet from "../assets/mainnet.svg?url"
import logoPolkadot from "../assets/polkadot.svg?url"
import logoSonic from "../assets/sonic.svg?url"
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

const NetworkItem: FC<{ logo: string; label: string }> = ({ logo, label }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <img src={logo} alt={label} className="ml-[-1rem] inline-block size-20 overflow-hidden" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const SupportedNetworks = () => {
  return (
    <div className={classNames("my-10 flex h-20 shrink-0 content-center pl-[1rem]")}>
      <NetworkItem logo={logoMainnet} label="Ethereum Mainnet" />
      <NetworkItem logo={logoBase} label="Base" />
      <NetworkItem logo={logoSonic} label="Sonic" />
      <NetworkItem logo={logoBittensor} label="Bittensor" />
      <NetworkItem logo={logoPolkadot} label="Polkadot" />
      <div className="ml-[-1rem] flex h-full w-auto p-1">
        <div className="text-grey-200 ring-body-secondary bg-grey-750 relative flex w-auto flex-col justify-center rounded-full px-3 text-center ring-1">
          <div className="font-bold">800+</div>
        </div>
      </div>
      <div className="text-body-secondary ml-2 content-center text-sm">Networks supported</div>
    </div>
  )
}

export const WelcomePage = () => {
  const { t } = useTranslation()
  useAnalyticsPageView(ANALYTICS_PAGE)
  const { reset, setStage } = useOnboard()
  const navigate = useNavigate()

  const handleNextClick = useCallback(
    () => async () => {
      reset()
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: "Onboarding Welcome -> Password",
      })
      navigate("/password")
    },
    [navigate, reset],
  )

  useEffect(() => {
    setStage(0)
  }, [setStage])

  return (
    <OnboardLayout analytics={ANALYTICS_PAGE} className="min-h-[60rem] min-w-[54rem]">
      <div className="my-[8rem] flex flex-col items-center justify-center gap-20">
        <div className="welcome-text flex select-none flex-col items-center gap-14 text-center xl:w-[76rem]">
          <div className="flex flex-col items-center gap-10 text-white xl:w-[65.2rem]">
            <LogoWithSupportPageRedirect />
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
            {t(
              "Talisman supports all Ethereum and Polkadot networks, including chains like Base, Bittensor, and Sonic",
            )}
          </div>
          <SupportedNetworks />
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

const LogoWithSupportPageRedirect = () => {
  const [clickCount, setClickCount] = useState(0)

  const handleClick = useCallback(() => {
    if (clickCount === 9) window.location.href = "support.html"
    else setClickCount((prev) => prev + 1)
  }, [clickCount])

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={handleClick}>
      <TalismanColouredHandWhiteTextLogo className="h-auto w-96" />
    </div>
  )
}
