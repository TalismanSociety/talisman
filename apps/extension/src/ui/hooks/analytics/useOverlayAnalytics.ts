import type { DISMISS_CAUSES } from "@common/analytics/properties"
import { toDurationMs } from "@common/analytics/schema"
import { track } from "@ui/api/track"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react"

export type DismissCause = (typeof DISMISS_CAUSES)[number]
type Gesture = Extract<DismissCause, "escape" | "backdrop">

type OverlayLayer = {
  markCompleted(): void
  /** The cause of this overlay's last close, for descendants that unmount with it. */
  closedCause(): DismissCause | null
}

export const OverlayAnalyticsContext = createContext<OverlayLayer | null>(null)

const openLayers: OverlayLayer[] = []

export const markInnermostOverlayCompleted = () => openLayers.at(-1)?.markCompleted()

/**
 * First that applies: the user finished what the overlay was for; the gesture that closed it;
 * the cause of the ancestor it unmounted with; anything else (its own buttons, code).
 */
export const resolveDismiss = ({
  completed,
  gesture,
  parentCause,
}: {
  completed: boolean
  gesture: Gesture | null
  parentCause: DismissCause | null
}): DismissCause => (completed ? "completed" : (gesture ?? parentCause ?? "button"))

type OverlayState = {
  openedAt: number
  completed: boolean
  gesture: Gesture | null
  closedCause: DismissCause | null
}

/**
 * modal_opened and modal_closed for what rendered: mounted open or opened, then closed or
 * unmounted while open. A close that does not happen while the gesture's handler runs (an
 * `onDismiss` that steps back, or closes after a timer) reads `button`.
 */
export const useOverlayAnalytics = ({ id, isOpen }: { id: string; isOpen: boolean }) => {
  const parent = useContext(OverlayAnalyticsContext)
  const state = useRef<OverlayState>({
    openedAt: 0,
    completed: false,
    gesture: null,
    closedCause: null,
  })

  const layer = useMemo<OverlayLayer>(
    () => ({
      markCompleted: () => {
        state.current.completed = true
        parent?.markCompleted()
      },
      closedCause: () => state.current.closedCause,
    }),
    [parent]
  )

  useEffect(() => {
    if (!isOpen) return
    const overlay = state.current
    Object.assign(overlay, {
      openedAt: performance.now(),
      completed: false,
      gesture: null,
      closedCause: null,
    })
    track("modal_opened", { modal_id: id })
    openLayers.push(layer)

    return () => {
      openLayers.splice(openLayers.lastIndexOf(layer), 1)
      const dismiss = resolveDismiss({
        completed: overlay.completed,
        gesture: overlay.gesture,
        parentCause: parent?.closedCause() ?? null,
      })
      overlay.closedCause = dismiss
      overlay.gesture = null
      track("modal_closed", {
        modal_id: id,
        dismiss,
        duration_ms: toDurationMs(performance.now() - overlay.openedAt),
      })
    }
  }, [isOpen, id, parent, layer])

  const dismissVia = useCallback(
    (gesture: Gesture, onDismiss: (() => void) | undefined) =>
      onDismiss &&
      (() => {
        state.current.gesture = gesture
        // the close commits while the handler runs, or it was not this gesture's close
        setTimeout(() => {
          if (state.current.gesture === gesture) state.current.gesture = null
        })
        onDismiss()
      }),
    []
  )

  return { layer, dismissVia }
}

/** For what finishes an overlay's purpose, such as a transaction submitted inside it. */
export const useMarkOverlayCompleted = () => {
  const layer = useContext(OverlayAnalyticsContext)
  return useCallback(() => layer?.markCompleted(), [layer])
}
