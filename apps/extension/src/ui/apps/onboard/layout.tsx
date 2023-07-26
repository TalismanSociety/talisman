import { BackButton } from "@talisman/components/BackButton"
import { hideScrollbarsStyle } from "@talisman/theme/styles"
import { classNames } from "@talismn/util"
import { AnalyticsPage } from "@ui/api/analytics"
import { Transition, Variants, motion } from "framer-motion"
import { FC, ReactNode } from "react"
import styled from "styled-components"

const Main = styled.main`
  //force dimensions and overflow to allow scrolling if very small screen
  ${hideScrollbarsStyle}

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

  .content .field input,
  .content .field textarea {
    text-align: left;
  }
`

type LayoutProps = {
  withBack?: boolean
  className?: string
  picture?: ReactNode
  children?: ReactNode
  analytics?: AnalyticsPage
}

const FADE_IN: Variants = {
  init: { opacity: 0 },
  anim: { opacity: 1 },
}

const TRANS_SLOW: Transition = {
  duration: 1,
  ease: "easeInOut",
}

export const Layout: FC<LayoutProps> = ({
  analytics,
  withBack = false,
  picture,
  children,
  className,
}) => (
  <Main className={classNames(className, "max-w-screen max-h-screen overflow-auto")}>
    <motion.section variants={FADE_IN} initial="init" animate="anim" transition={TRANS_SLOW}>
      {!!withBack && (
        <BackButton
          className="bg-body hover:bg-body absolute left-32 top-32 bg-opacity-10 transition-colors ease-in hover:bg-opacity-20"
          analytics={analytics}
        />
      )}
      {picture ? (
        <div className="flex w-full content-center gap-64">
          <div className="w-22 text-right">{picture}</div>
          <div className="w-22">{children}</div>
        </div>
      ) : (
        <div className="flex justify-center">{children}</div>
      )}
    </motion.section>
  </Main>
)
