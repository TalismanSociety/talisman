import { TalismanWhiteLogo } from "@talisman/theme/logos"
import { DownloadIcon, PlusIcon } from "@talismn/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { ReactNode, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { ReactComponent as ImportWalletIcons } from "../assets/import-wallet-icons.svg"
import { styleOnboardTranslucidBackground } from "../components/OnboardStyles"
import { useOnboard } from "../context"
import { Layout } from "../layout"

const WelcomeCtaContainer = styled.button`
  ${styleOnboardTranslucidBackground}
  border: none;
  color: var(--color-foreground);
  text-align: left;
  padding: 3.2rem;
  border-radius: 1.6rem;
  cursor: pointer;
  height: 18rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all var(--transition-speed-fast) ease-in-out;

  svg {
    transition: none;
  }

  :hover {
    background: var(--color-foreground);
    background: rgba(var(--color-foreground-raw), 0.95);
    color: var(--color-background);
  }
`

const Title = styled.div`
  font-family: WhyteInktrapMedium, sans-serif;
`

const Container = styled(Layout)`
  a {
    color: var(--color-foreground);
    color: white;
  }

  @media (max-width: 1270px) {
    > section {
      align-items: center;

      > div {
        gap: 4.8;

        ${Title} {
          font-size: 8rem;
          line-height: 8rem;
          font-weight: 500;
          letter-spacing: -0.01em;
        }

        .welcome-description {
          font-size: 2.4rem;
          line-height: 2.9rem;
        }

        .welcome-text {
          gap: 3.2rem;
          width: 44rem;
        }
      }
    }
  }

  @media (max-width: 1024px) {
    > section > div {
      flex-direction: column;
      gap: 4.8rem;

      .welcome-text,
      .welcome-buttons {
        width: 44rem;
      }
    }
  }

  @media (max-width: 640px) {
    > section > div {
      ${Title} {
        font-size: 6.4rem;
        line-height: 6.4rem;
        letter-spacing: -0.01em;
      }

      .welcome-description {
        font-size: 2rem;
        line-height: 2.4rem;
      }
    }
  }
`

const Logo = styled(TalismanWhiteLogo)`
  width: 19.6rem;
  height: auto;
`

const WelcomeCta = ({
  title,
  icon,
  description,
  onClick,
}: {
  title: ReactNode
  icon: ReactNode
  description: ReactNode
  onClick: () => void
}) => {
  return (
    <WelcomeCtaContainer type="button" onClick={onClick}>
      <div className="flex w-full justify-between">
        <div className="grow text-xl">{title}</div>
        <div className="text-3xl">{icon}</div>
      </div>
      <div>{description}</div>
    </WelcomeCtaContainer>
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 4,
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
  const { reset, updateData } = useOnboard()
  const navigate = useNavigate()

  const handleNextClick = useCallback(
    (recovery: boolean) => async () => {
      reset()
      updateData({ mnemonic: undefined }) // always clear this one, even in dev mode
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: recovery ? "Import Wallet Button" : "New Wallet Button",
      })
      navigate(recovery ? "/import" : "/password")
    },
    [navigate, reset, updateData]
  )

  return (
    <Container>
      <div className="my-[8rem] flex items-center justify-center gap-[10rem] ">
        <div className="welcome-text flex w-[67.3rem] flex-col gap-24 text-white">
          <div>
            <Logo />
          </div>
          <Title className="text-[12rem] leading-none">{t("Multi-chain made easy")}</Title>
          <div className="welcome-description text-xl">
            {t("Talisman supports Polkadot, Kusama, Ethereum, and more")}
          </div>
        </div>
        <div className="welcome-buttons flex w-[38rem] flex-col gap-12">
          <WelcomeCta
            title={t("New wallet")}
            icon={<PlusIcon />}
            description={t("Create a new Talisman wallet")}
            onClick={handleNextClick(false)}
          />
          <WelcomeCta
            title={t("Import a wallet")}
            icon={<DownloadIcon />}
            description={
              <div>
                <div>{t("Import an existing wallet")}</div>
                <ImportWalletIcons className="mt-8 h-12 w-auto" />
              </div>
            }
            onClick={handleNextClick(true)}
          />
          <div className="text-body-secondary text-sm leading-[2rem]">
            <Trans t={t}>
              By continuing, you agree to the{" "}
              <a
                href="https://docs.talisman.xyz/legal-and-security/terms-of-use"
                target="_blank"
                rel="noreferrer"
                onClick={handleLinkClick("Terms of Service")}
              >
                Terms of Service
              </a>
              <br />
              and{" "}
              <a
                href="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
                target="_blank"
                rel="noreferrer"
                onClick={handleLinkClick("Privacy Policy")}
              >
                Privacy Policy
              </a>
            </Trans>
          </div>
        </div>
      </div>
    </Container>
  )
}
