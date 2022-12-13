import { Box } from "@talisman/components/Box"
import { DownloadIcon, PlusIcon } from "@talisman/theme/icons"
import { TalismanWhiteLogo } from "@talisman/theme/logos"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { ReactNode, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { styleOnboardTranslucidBackground } from "../components/OnboardStyles"
import { useOnboard } from "../context"
import { Layout } from "../layout"
import { ReactComponent as ImportWalletIcons } from "../assets/import-wallet-icons.svg"

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

const Title = styled(Box)`
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
      <Box flex fullwidth justify="space-between">
        <Box grow fontsize="xlarge">
          {title}
        </Box>
        <Box fontsizecustom={4}>{icon}</Box>
      </Box>
      <Box>{description}</Box>
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
      <Box flex gap={10} justify="center" align="center" margin="8rem 0">
        <Box className="welcome-text" fg="foreground" flex column gap={4.8} w={67.3}>
          <Box>
            <Logo />
          </Box>
          <Title fontsizecustom={12} lineheightcustom={12}>
            Multi-chain made easy
          </Title>
          <Box className="welcome-description" fontsize="xlarge">
            Talisman supports Polkadot, Kusama, Ethereum, and more
          </Box>
        </Box>
        <Box className="welcome-buttons" flex column gap={2.4} w={38}>
          <WelcomeCta
            title="New wallet"
            icon={<PlusIcon />}
            description="Create a new Talisman wallet"
            onClick={handleNextClick(false)}
          />
          <WelcomeCta
            title="Import a wallet"
            icon={<DownloadIcon />}
            description={
              <div>
                <div>Import an existing wallet</div>
                <ImportWalletIcons className="mt-8 h-12 w-auto" />
              </div>
            }
            onClick={handleNextClick(true)}
          />
          <Box fg="mid" fontsize="small" lineheightcustom="2rem">
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
          </Box>
        </Box>
      </Box>
    </Container>
  )
}
