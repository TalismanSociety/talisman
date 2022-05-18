import { CSSProperties, ReactNode, useEffect, useMemo } from "react"
import { useFloating, shift, flip, offset } from "@floating-ui/react-dom"
import styled from "styled-components"
import { useTooltipBoundary } from "./TooltipBoundaryContext"

type TooltipContainerProps = {
  tooltip: ReactNode
  children: ReactNode
  as?: "span" | "div"
  className?: string
  noWrap?: boolean
}

const Tooltip = styled.div`
  z-index: 1;
  background: var(--color-background-muted);
  border-radius: 0.5rem;
  border: 1px solid var(--color-background-muted-3x);
  color: var(--color-foreground-muted-2x);
  padding: 0.6rem 1.2rem;
  transition: opacity var(--transition-speed) ease-in-out;
  opacity: 0;
  visibility: hidden;
  font-size: var(--font-size-small);
  line-height: var(--font-size-medium);
  font-weight: var(--font-weight-medium);
  word-break: break-word;

  &.show {
    opacity: 1;
    visibility: visible;
  }
`

export const WithTooltip = ({
  tooltip,
  children,
  as: Container = "span",
  className,
  noWrap,
}: TooltipContainerProps) => {
  const boundary = useTooltipBoundary()

  const { x, y, reference, floating, strategy, refs, update } = useFloating({
    strategy: "fixed",
    middleware: [offset(16), shift({ boundary }), flip({ boundary })],
  })

  useEffect(() => {
    const container = refs.reference.current as HTMLElement
    const floating = refs.floating.current as HTMLElement

    if (!tooltip) return

    const show = () => {
      //update coordinates before displaying
      update()
      floating.classList.add("show")
    }
    const hide = () => {
      floating.classList.remove("show")
    }

    container.addEventListener("mouseenter", show)
    container.addEventListener("mouseleave", hide)

    return () => {
      container.removeEventListener("mouseenter", show)
      container.removeEventListener("mouseleave", hide)
    }
  }, [refs, tooltip, update])

  const tooltipStyle: CSSProperties = useMemo(
    () => ({
      position: strategy,
      top: (y ?? 0) - (boundary?.offsetTop ?? 0),
      left: (x ?? 0) - (boundary?.offsetLeft ?? 0),
      whiteSpace: noWrap ? "nowrap" : undefined,
    }),
    [boundary?.offsetLeft, boundary?.offsetTop, noWrap, strategy, x, y]
  )

  return (
    <>
      <Container ref={reference} className={className}>
        {children}
      </Container>
      <Tooltip ref={floating} className="tooltip" style={tooltipStyle}>
        {tooltip}
      </Tooltip>
    </>
  )
}
