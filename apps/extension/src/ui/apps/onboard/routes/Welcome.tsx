import { Box } from "@talisman/components/Box"
import { DownloadIcon, PlusIcon } from "@talisman/theme/icons"
import { TalismanWhiteLogo } from "@talisman/theme/logos"
import { ReactNode, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { styleOnboardTranslucidBackground } from "../components/OnboardStyles"
import { useOnboard } from "../context"
import { Layout } from "../layout"

const Container = styled(Layout)`
  /* background: rgb(131, 58, 180);
  background: linear-gradient(
    20deg,
    var(--color-background) 0%,
    rgba(186, 132, 255, 0.3) 50%,
    rgba(244, 143, 69, 0.3) 100%
  ); */
`

const Logo = styled(TalismanWhiteLogo)`
  width: 19.6rem;
  height: auto;
`

const WelcomeCtaContainer = styled.button`
  ${styleOnboardTranslucidBackground}
  border: none;
  color: var(--color-foreground);
  text-align: left;
  padding: 3.2rem;
  border-radius: 1.6rem;
  cursor: pointer;
  width: 38rem;
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

const Title = styled(Box)`
  font-family: WhyteInktrapMedium, sans-serif;
`

export const WelcomePage = () => {
  const { reset, updateData } = useOnboard()
  const navigate = useNavigate()

  const handleNextClick = useCallback(
    (recovery: boolean) => () => {
      reset()
      updateData({ mnemonic: undefined }) // always clear this one, even in dev mode
      navigate(recovery ? "/import" : "/password")
    },
    [navigate, reset, updateData]
  )

  return (
    <Container>
      <Box flex gap={10} justify="center">
        <Box fg="foreground" flex column gap={4.8} w={67.3}>
          <Box>
            <Logo />
          </Box>
          <Title fontsizecustom={12} lineheightcustom={12}>
            Multi-chain made easy
          </Title>
          <Box fontsize="xlarge">Talisman supports Polkadot, Kusama, Ethereum and more</Box>
        </Box>
        <Box flex column gap={2.4} margin="6rem 0 0 0">
          <WelcomeCta
            title="New wallet"
            icon={<PlusIcon />}
            description="Create a new Talisman wallet"
            onClick={handleNextClick(false)}
          />
          <WelcomeCta
            title="Import a wallet"
            icon={<DownloadIcon />}
            description="Import an existing wallet such as Polkadot.js or Metamask"
            onClick={handleNextClick(true)}
          />
        </Box>
      </Box>
    </Container>
  )
}
