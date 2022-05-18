import { useEffect } from "react"
import styled from "styled-components"
import Button from "@talisman/components/Button"
import { FullColorLogo } from "@talisman/theme/logos"
import { Layout } from "../layout"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { motion, Transition, Variants } from "framer-motion"

import imgSwami from "@talisman/theme/images/onboard_swami.png"
import imgHood from "@talisman/theme/images/onboard_hood.png"
import imgAgyle from "@talisman/theme/images/onboard_agyle.png"
import imgNipsey from "@talisman/theme/images/onboard_nipsey.png"

const Logo = styled(FullColorLogo)`
  height: 4rem;
  width: auto;
  position: absolute;
  top: 4.2rem;
`

const Content = styled(motion.div)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  //background: var(--color-background);
  z-index: 1;
  width: 100%;
  gap: 4.8rem;
  padding-bottom: 17.7rem;
  position: relative;
  padding: 12rem 0;
`

const H1 = styled(motion.h1)`
  &&& {
    font-size: 12.6rem;
    line-height: 13.1rem;
    font-weight: var(--font-weight-bold);
    z-index: 1;
  }
`

const P = styled(motion.p)`
  &&& {
    font-size: var(--font-size-large);
    line-height: var(--font-size-xlarge);
    font-weight: var(--font-weight-bold);
    width: 46.9rem;
    padding-right: 3rem;
    color: var(--color-foreground);
    z-index: 1;
  }
`

const Agyle = styled(motion.img).attrs({
  src: imgAgyle,
  alt: "Agyle",
})`
  position: absolute;
  right: 62.39rem;
  bottom: 0;
  height: 41.88rem;
  width: 28.605rem;
  @media (max-width: 1346px) {
    display: none;
  }
  z-index: 1;
`
const Nipsey = styled(motion.img).attrs({
  src: imgNipsey,
  alt: "Nipsey",
})`
  position: absolute;
  right: 29rem;
  bottom: 7.423rem;
  height: 50.677rem;
  width: 50.578rem;
  z-index: 0;
  @media (max-width: 1180px) {
    display: none;
  }
`
const Swami = styled(motion.img).attrs({
  src: imgSwami,
  alt: "Swami",
})`
  position: absolute;
  right: 7.586rem;
  bottom: 0;
  height: 47.942rem;
  width: 42.994rem;
  @media (max-width: 960px) {
    display: none;
  }
`
const Hood = styled(motion.img).attrs({
  src: imgHood,
  alt: "Hood",
})`
  position: absolute;
  right: -7rem;
  bottom: 5.95rem;
  height: 50.677rem;
  width: 33.949rem;
  @media (max-width: 970px) {
    display: none;
  }
`

const BtnNext = styled(Button)`
  width: 24rem;
`

const STAGGER_CHILDREN: Transition = { staggerChildren: 0.2, delay: 0.2 }

const SLIDE_IN_LEFT: Variants = {
  initial: { x: -200, opacity: 0 },
  animate: { x: 0, opacity: 1 },
}

const SLIDE_IN_RIGHT: Variants = {
  initial: { x: 500, opacity: 0 },
  animate: { x: 0, opacity: 1 },
}

export const Welcome = () => {
  const isOnboarded = useIsOnboarded()

  // check for onboarded status & redirect to dashboard
  // if already onboarded - doing it here because if we
  // do it in the root provider we get redirected as soon
  // as the flag is set, and this page is always shown initially
  useEffect(() => {
    if (isOnboarded === "TRUE") {
      window.location.href = window.location.href.replace("onboarding.html", "dashboard.html")
    }
  }, [isOnboarded])

  return (
    <Layout>
      <div>
        <Logo />
      </div>
      <Content transition={STAGGER_CHILDREN} initial="initial" animate="animate">
        <H1 variants={SLIDE_IN_LEFT}>Unlock the Paraverse</H1>
        <P variants={SLIDE_IN_LEFT}>
          Talisman is a multi-chain wallet that unlocks a universe of applications in Polkadot and
          Kusama.
        </P>
        <motion.div variants={SLIDE_IN_LEFT}>
          <BtnNext primary to={`/terms`}>
            Get started
          </BtnNext>
        </motion.div>
        <motion.div transition={STAGGER_CHILDREN} initial="initial" animate="animate">
          <Agyle variants={SLIDE_IN_RIGHT} />
          <Nipsey variants={SLIDE_IN_RIGHT} />
          <Swami variants={SLIDE_IN_RIGHT} />
          <Hood variants={SLIDE_IN_RIGHT} />
        </motion.div>
      </Content>
    </Layout>
  )
}
