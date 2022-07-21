import { ChevronDownIcon } from "@talisman/theme/icons"
import { TargetAndTransition, motion } from "framer-motion"
import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from "react"
import styled from "styled-components"

const TRANSITION_ACCORDION = { ease: "easeInOut", duration: 0.3 }

const AccordionIconContainer = styled(motion.div)`
  height: 1em;
  width: 1em;
`

// Note : not a button because usually we want the whole accordion title row (title, data, + the icon) to be clickable
// didn't package the row neither to keep this very generic

export const AccordionIcon = ({ isOpen }: { isOpen: boolean }) => {
  const animate = useMemo(() => ({ rotate: isOpen ? 0 : -90 }), [isOpen])

  return (
    <AccordionIconContainer initial={false} animate={animate} transition={TRANSITION_ACCORDION}>
      <ChevronDownIcon />
    </AccordionIconContainer>
  )
}

const AccordionContainer = styled(motion.div)`
  overflow-y: hidden;
`

export const Accordion = ({ isOpen, children }: { isOpen: boolean; children?: ReactNode }) => {
  const [contentHeight, setContentHeight] = useState<number>()
  const refContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = refContainer.current
    if (!container) return () => {}

    const updateContentHeight = () => {
      setContentHeight(container.scrollHeight)
    }

    container.addEventListener("resize", updateContentHeight)

    return () => {
      container.removeEventListener("resize", updateContentHeight)
    }
  }, [])

  const style: CSSProperties = useMemo(
    () => ({
      height: contentHeight,
    }),
    [contentHeight]
  )

  const animate: TargetAndTransition = useMemo(
    () => ({
      height: isOpen ? contentHeight : 0,
    }),
    [contentHeight, isOpen]
  )

  return (
    <AccordionContainer
      style={style}
      ref={refContainer}
      animate={animate}
      initial={false}
      transition={TRANSITION_ACCORDION}
    >
      {children}
    </AccordionContainer>
  )
}
