import { hideScrollbarsStyle } from "@talisman/theme/styles"
import { classNames } from "@talismn/util"
import { RefObject, forwardRef, useEffect, useMemo, useRef, useState } from "react"
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

    ${hideScrollbarsStyle}
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
      z-index: 1;
      opacity: 1;
      z-index: 1;
    }
  }

  &.more-bottom {
    &:after {
      z-index: 1;
      opacity: 1;
      z-index: 1;
    }
  }
`

type ScrollContainerProps = {
  className?: string
  children?: React.ReactNode
  innerClassName?: string
}

// optional forwardRef to handle scroll to top controlled by parent
export const ScrollContainer = forwardRef<HTMLDivElement, ScrollContainerProps>(
  ({ className, children, innerClassName = "scrollable-children" }, forwardedRef) => {
    const localRef = useRef<HTMLDivElement>(null)
    const refDiv = useMemo(
      () => (forwardedRef || localRef) as RefObject<HTMLDivElement>,
      [forwardedRef, localRef]
    )
    const [more, setMore] = useState<{ top: boolean; bottom: boolean }>({
      top: false,
      bottom: false,
    })

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
      window.addEventListener("resize", handleDetectScroll)

      // init
      handleDetectScroll()

      // sometimes on init scrollHeight === clientHeight, setTimeout fixes the problem
      setTimeout(() => handleDetectScroll(), 50)

      return () => {
        scrollable.removeEventListener("scroll", handleDetectScroll)
        scrollable.removeEventListener("resize", handleDetectScroll)
        window.removeEventListener("resize", handleDetectScroll)
      }
    }, [refDiv])

    if (typeof forwardedRef === "function")
      throw new Error("forwardRef as function is not supported")

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
)
ScrollContainer.displayName = "ScrollContainer"
