import { ArrowRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ChainId, EvmNetworkId } from "extension-core"
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "extension-shared"
import { useCallback, useEffect, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { WithTooltip } from "@talisman/components/Tooltip"
import { TalismanColouredHandWhiteTextLogo } from "@talisman/theme/logos"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { PortfolioNetwork } from "@ui/domains/Portfolio/AssetsTable/usePortfolioNetworks"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { getNetworkInfo } from "@ui/hooks/useNetworkInfo"
import { useChainsMap, useEvmNetworksMap } from "@ui/state"

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

const WelcomeNetworkStackItem = ({ network }: { network?: PortfolioNetwork }) => {
  const tooltip = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <ChainLogo id={network?.id} />
        <div>
          {network?.label} ({network?.type})
        </div>
      </div>
    ),
    [network],
  )

  if (!network) return null

  return (
    <div className="ml-[-1rem] inline-block overflow-hidden">
      <WithTooltip tooltip={tooltip}>
        <ChainLogo key={network.id} id={network.id} className="h-20 w-20" />
      </WithTooltip>
    </div>
  )
}

type NetworkStackProps = { ids: (ChainId | EvmNetworkId)[]; className?: string }
export const WelcomeNetworkStack = ({ className, ids }: NetworkStackProps) => {
  const { t } = useTranslation()

  const chainsMap = useChainsMap()
  const evmNetworksMap = useEvmNetworksMap()
  const networks = useMemo(
    () =>
      ids.flatMap((id) => {
        const chain = chainsMap[id]
        const evmNetwork = evmNetworksMap[id]
        if (!chain && !evmNetwork) return []

        const relay = chain?.relay?.id ? chainsMap[chain.relay.id] : null
        const { label, type } = getNetworkInfo(t, { chain, evmNetwork, relay })

        return { id, label, type, logo: chain?.logo ?? evmNetwork?.logo }
      }),
    [chainsMap, evmNetworksMap, ids, t],
  )

  return (
    <div className={classNames("flex shrink-0 content-center pl-[1rem]", className)}>
      {networks?.map((network, idx) => (
        <WelcomeNetworkStackItem key={`${network}-${idx}`} network={network} />
      ))}
      <div className="ml-[-1rem] flex h-full w-auto p-1">
        <div className="text-grey-200 ring-body-secondary bg-grey-750 relative flex w-auto flex-col justify-center rounded-full px-3 text-center ring-1">
          <div className="font-bold">800+</div>
        </div>
      </div>
    </div>
  )
}

export const WelcomePage = () => {
  const { t } = useTranslation("onboard")
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
        <div className="welcome-text flex flex-col items-center gap-14 text-center xl:w-[76rem]">
          <div className="flex flex-col items-center gap-10 text-white xl:w-[65.2rem]">
            <TalismanColouredHandWhiteTextLogo className="h-auto w-96" />
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
          <div className="justify flex justify-between gap-2 py-10 align-middle">
            <WelcomeNetworkStack
              ids={["1", "8453", "146", "bittensor", "polkadot"]}
              className="h-20"
            />
            <div className="text-body-secondary content-center text-sm">Networks supported</div>
          </div>
        </div>
        <div className="welcome-button flex w-[44rem] flex-col gap-8">
          <Button primary icon={ArrowRightIcon} onClick={handleNextClick()}>
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
