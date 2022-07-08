import { noScrollbarsStyle } from "@talisman/theme/styles"
import { classNames } from "@talisman/util/classNames"
import { useEffect, useRef, useState } from "react"
import styled from "styled-components"

const Container = styled.section`
  position: relative;
  overflow: auto;

  > div {
    overflow: hidden;
    overflow-y: auto;
    height: 100%;
    display: block;
    width: 100%;

    ${noScrollbarsStyle}
  }

  &:before,
  &:after {
    z-index: 0;
    content: "";
    position: absolute;
    left: 0;
    width: 100%;
    height: 2.4rem;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--transition-speed-fast) ease-out;
  }

  &:before {
    top: 0;
    background: linear-gradient(var(--color-background), transparent);
  }

  &:after {
    bottom: 0;
    background: linear-gradient(transparent, var(--color-background));
  }

  &.more-top {
    &:before {
      opacity: 1;
    }
  }

  &.more-bottom {
    &:after {
      opacity: 1;
    }
  }
`

type ScrollContainerProps = {
  className?: string
  children?: React.ReactNode
  innerClassName?: string
}

export const ScrollContainer = ({
  className,
  children,
  innerClassName = "scrollable-children",
}: ScrollContainerProps) => {
  const refDiv = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState<{ top: boolean; bottom: boolean }>({ top: false, bottom: false })

  useEffect(() => {
    const scrollable = refDiv.current
    if (!scrollable) return

    const handleDetectScroll = () => {
      setMore({
        top: scrollable.scrollTop > 0,
        bottom: scrollable.scrollHeight - scrollable.scrollTop > scrollable.clientHeight,
      })
    }
    scrollable.addEventListener("scroll", handleDetectScroll)
    scrollable.addEventListener("resize", handleDetectScroll)
    handleDetectScroll()

    return () => {
      scrollable.removeEventListener("scroll", handleDetectScroll)
      scrollable.removeEventListener("resize", handleDetectScroll)
    }
  }, [children, refDiv])

  return (
    <Container
      className={classNames(className, more.top && "more-top", more.bottom && "more-bottom")}
    >
      <div ref={refDiv} className={innerClassName}>
        {children}
      </div>
    </Container>
  )
}
