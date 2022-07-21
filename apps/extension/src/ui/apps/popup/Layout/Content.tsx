import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { classNames } from "@talisman/util/classNames"
import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"

const Content = ({ children, className }: any) => {
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
