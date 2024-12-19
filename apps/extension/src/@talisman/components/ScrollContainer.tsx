import { classNames } from "@talismn/util"
import { forwardRef, RefObject, useEffect, useMemo, useRef, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"

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
      [forwardedRef, localRef],
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
      <div
        className={classNames(
          "relative z-0 overflow-hidden",
          more.top && "more-top",
          more.bottom && "more-bottom",
          className,
        )}
      >
        <div
          ref={refDiv}
          className={classNames(
            "no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden",
            innerClassName,
          )}
        >
          {/* In case of suspense, revDiv.current might be null on first render. This causes problems with child row virtualizers which memoize it, on production builds only */}
          {!!refDiv.current && (
            <ScrollContainerProvider refContainer={refDiv}>{children}</ScrollContainerProvider>
          )}
        </div>
        <div
          className={classNames(
            "pointer-events-none absolute left-0 top-0 h-12 w-full bg-gradient-to-b from-black to-transparent",
            more.top ? "opacity-100" : "opacity-0",
          )}
        ></div>
        <div
          className={classNames(
            "pointer-events-none absolute bottom-0 left-0 h-12 w-full bg-gradient-to-t from-black to-transparent",
            more.bottom ? "opacity-100" : "opacity-0",
          )}
        ></div>
      </div>
    )
  },
)
ScrollContainer.displayName = "ScrollContainer"

const useScrollContainerProvider = ({
  refContainer,
}: {
  refContainer: RefObject<HTMLDivElement>
}) => {
  return refContainer
}

const [ScrollContainerProvider, useScrollContainer] = provideContext(useScrollContainerProvider)

// this hook will provite a way for its children to access the ref of the scrollable element
// mainly useful when using a virtualizer or other scroll related libraries
export { useScrollContainer }
