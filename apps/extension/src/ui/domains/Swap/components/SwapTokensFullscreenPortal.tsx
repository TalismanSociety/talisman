import { atom, useAtomValue, useSetAtom } from "jotai"
import { ReactNode, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

const containerRefAtom = atom<HTMLElement | null>(null)

/** The parent of this node will be used as the container for swaps account / token pickers */
export const SwapTokensFullscreenPortalContainer = () => {
  const setFullscreenPortalContainerRef = useSetAtom(containerRefAtom)

  const childRef = useRef<HTMLDivElement | null>(null)
  useEffect(
    () => void setFullscreenPortalContainerRef(childRef.current?.parentElement ?? null),
    [setFullscreenPortalContainerRef],
  )

  return <div ref={childRef} />
}

/** The children of this node will be rendered into the parent of <SwapTokensFullscreenPortalContainer /> */
export const SwapTokensFullscreenPortal = ({ children }: { children?: ReactNode }) => {
  const container = useAtomValue(containerRefAtom)
  // eslint-disable-next-line no-console
  if (!container) return console.warn(`No SwapTokensFullscreenPortalContainer`), null

  return createPortal(children, container)
}
