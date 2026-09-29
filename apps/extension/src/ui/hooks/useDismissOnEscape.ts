import { type RefObject, useEffect, useRef } from "react"

type OnDismissRef = RefObject<(() => void) | undefined>

// open modals and drawers, in the order they opened: Escape only dismisses the last one
const layers: OnDismissRef[] = []

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return

  const onDismiss = layers.at(-1)?.current
  if (!onDismiss) return

  event.preventDefault()
  onDismiss()
}

/**
 * Escape calls the `onDismiss` of the innermost open layer, like a click on its backdrop.
 * A layer without `onDismiss` blocks Escape, so it never reaches the layers beneath.
 * The listener sits on `window`, so popovers and listboxes that stop the event close first.
 */
export const useDismissOnEscape = (isOpen: boolean, onDismiss: (() => void) | undefined) => {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (!isOpen) return

    layers.push(onDismissRef)
    if (layers.length === 1) window.addEventListener("keydown", handleKeyDown)

    return () => {
      layers.splice(layers.indexOf(onDismissRef), 1)
      if (!layers.length) window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])
}
