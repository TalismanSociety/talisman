import { createContext, type RefObject, useContext, useEffect, useMemo, useRef } from "react"

type DismissLayer = {
  parent: DismissLayer | null
  onDismissRef: RefObject<(() => void) | undefined>
}

export const DismissLayerContext = createContext<DismissLayer | null>(null)

// open modals and drawers, innermost last: Escape only dismisses the last one
const layers: DismissLayer[] = []

const isDescendant = (layer: DismissLayer, ancestor: DismissLayer) => {
  for (let parent = layer.parent; parent; parent = parent.parent)
    if (parent === ancestor) return true
  return false
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return

  const onDismiss = layers.at(-1)?.onDismissRef.current
  if (!onDismiss) return

  event.preventDefault()
  onDismiss()
}

/**
 * Escape calls the `onDismiss` of the innermost open layer, like a click on its backdrop.
 * A layer without `onDismiss` blocks Escape, so it never reaches the layers beneath.
 * The listener sits on `window`, so popovers and listboxes that stop the event close first.
 * Provide the returned layer through `DismissLayerContext` so nested layers rank above it.
 */
export const useDismissOnEscape = (isOpen: boolean, onDismiss: (() => void) | undefined) => {
  const parent = useContext(DismissLayerContext)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  const layer = useMemo<DismissLayer>(() => ({ parent, onDismissRef }), [parent])

  useEffect(() => {
    if (!isOpen) return

    // child effects run first: nested layers that opened in the same render are already stacked
    const firstDescendant = layers.findIndex((other) => isDescendant(other, layer))
    layers.splice(firstDescendant === -1 ? layers.length : firstDescendant, 0, layer)
    if (layers.length === 1) window.addEventListener("keydown", handleKeyDown)

    return () => {
      layers.splice(layers.indexOf(layer), 1)
      if (!layers.length) window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, layer])

  return layer
}
