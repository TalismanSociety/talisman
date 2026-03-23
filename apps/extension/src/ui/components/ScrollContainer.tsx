import { cn } from "@ui/util/cn"
import { provideContext } from "@ui/util/provideContext"
import { forwardRef, type RefObject, useEffect, useMemo, useRef, useState } from "react"

type ScrollContainerProps = {
  className?: string
  children?: React.ReactNode
  innerClassName?: string
}

// optional forwardRef to handle scroll to top controlled by parent
export const ScrollContainer = forwardRef<HTMLDivElement, ScrollContainerProps>(
  ({ className, children, innerClassName = "scrollable-children" }, forwardedRef) => {
    const localRef = useRef<HTMLDivElement>(null)
    const ref = useMemo(
      () => (forwardedRef || localRef) as RefObject<HTMLDivElement>,
      [forwardedRef]
    )
    const [more, setMore] = useState<{ top: boolean; bottom: boolean }>({
      top: false,
      bottom: false,
    })

    useEffect(() => {
      const scrollable = ref.current
      if (!scrollable) return

      const handleDetectScroll = () => {
        // tolerance avoids false positives from sub-pixel rounding
        const tolerance = 1
        setMore({
          top: scrollable.scrollTop > tolerance,
          bottom:
            scrollable.scrollHeight - scrollable.scrollTop > scrollable.clientHeight + tolerance,
        })
      }

      scrollable.addEventListener("scroll", handleDetectScroll)
      window.addEventListener("resize", handleDetectScroll)

      // observe content size changes (async rendering, list updates)
      const resizeObserver = new ResizeObserver(handleDetectScroll)
      resizeObserver.observe(scrollable)
      for (const child of scrollable.children) resizeObserver.observe(child)

      handleDetectScroll()

      return () => {
        scrollable.removeEventListener("scroll", handleDetectScroll)
        window.removeEventListener("resize", handleDetectScroll)
        resizeObserver.disconnect()
      }
    }, [ref])

    if (typeof forwardedRef === "function")
      throw new Error("forwardRef as function is not supported")

    return (
      <div
        className={cn(
          "relative z-0 overflow-hidden",
          more.top && "more-top",
          more.bottom && "more-bottom",
          className
        )}
      >
        <div
          ref={ref}
          className={cn(
            "no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden",
            innerClassName
          )}
        >
          <ScrollContainerProvider container={{ ref }}>{children}</ScrollContainerProvider>
        </div>
        <div
          className={cn(
            "pointer-events-none absolute top-0 left-0 h-12 w-full bg-linear-to-b from-black to-transparent",
            more.top ? "opacity-100" : "opacity-0"
          )}
        ></div>
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 left-0 h-12 w-full bg-linear-to-t from-black to-transparent",
            more.bottom ? "opacity-100" : "opacity-0"
          )}
        ></div>
      </div>
    )
  }
)
ScrollContainer.displayName = "ScrollContainer"

type ScrollContainerProviderProps = {
  // wrap ref in an object so its triggers a re-render when the object changes
  container: {
    ref: RefObject<HTMLDivElement>
  }
}

const useScrollContainerProvider = ({ container }: ScrollContainerProviderProps) => {
  return container
}

const [ScrollContainerProvider, useScrollContainer] = provideContext(useScrollContainerProvider)

// this hook will provite a way for its children to access the ref of the scrollable element
// mainly useful when using a virtualizer or other scroll related libraries
export { useScrollContainer }
