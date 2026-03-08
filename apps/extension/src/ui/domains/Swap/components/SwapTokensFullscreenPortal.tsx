import { log } from "@common/log"
import { provideContext } from "@ui/util/provideContext"
import { type ReactNode, useCallback, useRef, useState } from "react"
import { createPortal } from "react-dom"

const useFullscreenPortalContext = () => {
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null)
  return { containerRef, setContainerRef }
}

const [FullscreenPortalProvider, useFullscreenPortal] = provideContext(useFullscreenPortalContext)

export { FullscreenPortalProvider }

/** The parent of this node will be used as the container for swaps account / token pickers */
export const SwapTokensFullscreenPortalContainer = () => {
  const { setContainerRef } = useFullscreenPortal()

  const childRef = useRef<HTMLDivElement | null>(null)
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      childRef.current = node
      setContainerRef(node?.parentElement ?? null)
    },
    [setContainerRef]
  )

  return <div ref={setRef} />
}

/** The children of this node will be rendered into the parent of <SwapTokensFullscreenPortalContainer /> */
export const SwapTokensFullscreenPortal = ({ children }: { children?: ReactNode }) => {
  const { containerRef: container } = useFullscreenPortal()

  if (!container) {
    log.warn(`No SwapTokensFullscreenPortalContainer`)
    return null
  }

  return createPortal(children, container)
}
