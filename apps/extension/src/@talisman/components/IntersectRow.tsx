import { FC, PropsWithChildren, useRef } from "react"
import { useIntersection } from "react-use"

export const IntersectRow: FC<PropsWithChildren<{ className?: string; rootMargin?: string }>> = ({
  children,
  className,
  rootMargin,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  const intersection = useIntersection(ref, {
    root: null,
    rootMargin,
  })

  return (
    <div ref={ref} className={className}>
      {intersection?.isIntersecting ? children : null}
    </div>
  )
}
