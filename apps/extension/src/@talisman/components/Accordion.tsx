import { ChevronDownIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { TargetAndTransition, Transition, motion } from "framer-motion"
import { CSSProperties, FC, ReactNode, useEffect, useMemo, useRef, useState } from "react"

const TRANSITION_ACCORDION: Transition = { ease: "easeInOut", duration: 0.3 }

// Note : not a button because usually we want the whole accordion title row (title, data, + the icon) to be clickable
// didn't package the row neither to keep this very generic

export const AccordionIcon = ({ isOpen }: { isOpen: boolean }) => {
  // const animate = useMemo(() => ({ rotate: isOpen ? 0 : -90 }), [isOpen])

  return (
    <div
      className={classNames(
        "transition-transform duration-300 ease-in-out",
        isOpen ? "rotate-0" : "rotate-[-90deg]"
      )}
    >
      <ChevronDownIcon />
    </div>
  )
}

export const Accordion: FC<{ isOpen: boolean; children?: ReactNode; alwaysRender?: boolean }> = ({
  isOpen,
  children,
  alwaysRender,
}) => {
  const [contentHeight, setContentHeight] = useState<number>()
  const refContainer = useRef<HTMLDivElement>(null)

  const [shouldRender, setShouldRender] = useState(isOpen)

  useEffect(() => {
    const container = refContainer.current
    if (!container) return () => {}

    const updateContentHeight = () => {
      setContentHeight(container.scrollHeight)
    }

    container.addEventListener("resize", updateContentHeight)
    updateContentHeight()

    return () => {
      container.removeEventListener("resize", updateContentHeight)
    }
  }, [shouldRender])

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

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      return () => []
    } else {
      const timeout = setTimeout(() => {
        setShouldRender(false)
      }, 1000)
      return () => {
        clearTimeout(timeout)
      }
    }
  }, [isOpen])

  return (
    <motion.div
      className="overflow-y-hidden"
      style={style}
      ref={refContainer}
      animate={animate}
      initial={false}
      transition={TRANSITION_ACCORDION}
    >
      {!!(alwaysRender || shouldRender) && children}
    </motion.div>
  )
}
