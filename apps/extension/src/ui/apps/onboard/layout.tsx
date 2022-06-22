import { FC, ReactNode } from "react"
import styled from "styled-components"
import { BackButton } from "@talisman/components/BackButton"
import { motion, Transition, Variants } from "framer-motion"

const Main = styled.main`
  //force dimensions and overflow to allow scrolling if very small screen
  overflow: auto;
  max-width: 100vw;
  max-height: 100vh;

  > section {
    margin: 0 auto;
    max-width: 144rem;
    width: 100%;
    position: relative;
    padding: 0 6.4rem;
    height: 100%;
    min-height: 100vw;

    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 100vh;
    text-align: left;
  }

  > section > .hflex {
    width: 100%;
    display: flex;
    gap: 13.5rem;
    justify-content: center;

    .picture,
    .content {
      width: 44rem;
    }

    .picture {
      text-align: right;
    }

    @media (max-width: 1146px) {
      flex-direction: column;
      align-items: center;
      gap: 1rem;

      .picture,
      .content {
        text-align: center;
      }
    }
  }

  > section .content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2.4rem;
  }

  h1 {
    font-size: var(--font-size-large);
    line-height: var(--font-size-xlarge);
    font-weight: var(--font-weight-bold);
    margin: 0;
  }

  p {
    font-size: var(--font-size-normal);
    line-height: var(--font-size-large);
    margin: 0;
    color: var(--color-mid);
  }

  .content .field input,
  .content .field textarea {
    text-align: left;
  }
`

const BtnBack = styled(BackButton)`
  position: absolute;
  top: 6.4rem;
  left: 6.4rem;
`

type LayoutProps = {
  withBack?: boolean
  className?: string
  picture?: ReactNode
  children?: ReactNode
}

const FADE_IN: Variants = {
  init: { opacity: 0 },
  anim: { opacity: 1 },
}

const TRANS_MED: Transition = {
  type: "spring",
  duration: 0.5,
}
const TRANS_SLOW: Transition = {
  type: "spring",
  duration: 1,
}

const SLIDE_IN_LEFT: Variants = {
  init: { x: -200 },
  anim: { x: 0 },
}

const SLIDE_IN_RIGHT: Variants = {
  init: { x: 200 },
  anim: { x: 0 },
}

export const Layout: FC<LayoutProps> = ({ withBack = false, picture, children, className }) => (
  <Main className={className}>
    <motion.section variants={FADE_IN} initial="init" animate="anim" transition={TRANS_SLOW}>
      {!!withBack && <BtnBack />}
      {picture ? (
        <div className="hflex">
          <motion.div className="picture" variants={SLIDE_IN_LEFT} transition={TRANS_MED}>
            {picture}
          </motion.div>
          <motion.div className="content" variants={SLIDE_IN_RIGHT} transition={TRANS_MED}>
            {children}
          </motion.div>
        </div>
      ) : (
        children
      )}
    </motion.section>
  </Main>
)
