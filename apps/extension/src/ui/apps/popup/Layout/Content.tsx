import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { classNames } from "@talismn/util"
import { FC, PropsWithChildren, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"

const Content: FC<PropsWithChildren & { className?: string }> = ({ children, className }) => {
  //scrollToTop on location change
  const scrollableRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  useEffect(() => {
    scrollableRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <ScrollContainer
      ref={scrollableRef}
      className={classNames("layout-content", className)}
      innerClassName="children"
    >
      {children}
    </ScrollContainer>
  )
}

Content.displayName = "layout-content"

export default Content
