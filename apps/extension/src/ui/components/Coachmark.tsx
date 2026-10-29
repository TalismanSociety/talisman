import type { CoachmarkId } from "@core/domains/app/coachmarks"
import {
  arrow,
  autoUpdate,
  FloatingArrow,
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  flip,
  type Middleware,
  offset,
  type Placement,
  type Rect,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useMergeRefs,
} from "@floating-ui/react"
import { StarsIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { useOverlayAnalytics } from "@ui/hooks/analytics/useOverlayAnalytics"
import { useAppState } from "@ui/state/app"
import {
  cloneElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useId,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

const SPOTLIGHT_PADDING = 2
const ANCHOR_TO_TOOLTIP = 12
const VIEWPORT_PADDING = 16

const trackAnchorRect: Middleware = {
  name: "anchorRect",
  fn: ({ rects }) => ({ data: rects.reference }),
}

const useCoachmark = (id: CoachmarkId) => {
  const [dismissed, setDismissed] = useAppState("dismissedCoachmarks")
  const [isClosed, setIsClosed] = useState(false)

  const dismiss = useCallback(() => {
    setIsClosed(true)
    setDismissed((prev) => (prev?.includes(id) ? prev : [...(prev ?? []), id]))
  }, [id, setDismissed])

  return { isOpen: !isClosed && !dismissed?.includes(id), dismiss }
}

type CoachmarkProps = {
  id: CoachmarkId
  title: ReactNode
  description: ReactNode
  placement?: Placement
  children: ReactElement<{ ref?: Ref<HTMLElement> }>
}

export const Coachmark = ({
  id,
  title,
  description,
  placement = "bottom",
  children,
}: CoachmarkProps) => {
  const { t } = useTranslation()
  const { isOpen, dismiss } = useCoachmark(id)
  const { layer, dismissVia } = useOverlayAnalytics({ id: `coachmark_${id}`, isOpen })
  const arrowRef = useRef<SVGSVGElement>(null)
  const titleId = useId()

  const { refs, floatingStyles, context, middlewareData, isPositioned } = useFloating({
    open: isOpen,
    onOpenChange: (open, _event, reason) => {
      if (!open) dismissVia(reason === "escape-key" ? "escape" : "backdrop", dismiss)?.()
    },
    placement,
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      trackAnchorRect,
      offset(ANCHOR_TO_TOOLTIP),
      flip({ padding: VIEWPORT_PADDING }),
      shift({ padding: VIEWPORT_PADDING }),
      arrow({ element: arrowRef }),
    ],
  })
  const { getFloatingProps } = useInteractions([useDismiss(context)])
  const anchorRef = useMergeRefs([refs.setReference, children.props.ref])

  const handleAcknowledge = useCallback(() => {
    layer.markCompleted()
    dismiss()
  }, [dismiss, layer])

  const anchorRect = middlewareData.anchorRect as Rect | undefined

  return (
    <>
      {cloneElement(children, { ref: anchorRef })}
      {isOpen && (
        <FloatingPortal>
          <FloatingOverlay lockScroll className="z-50">
            {isPositioned && anchorRect && <Spotlight rect={anchorRect} />}
          </FloatingOverlay>
          <FloatingFocusManager context={context} initialFocus={refs.floating}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              role="dialog"
              aria-labelledby={titleId}
              className="z-50 flex w-[16rem] animate-fade-in flex-col gap-6 rounded bg-black-secondary p-8"
              {...getFloatingProps()}
            >
              <FloatingArrow
                ref={arrowRef}
                context={context}
                width={14}
                height={7}
                className="fill-black-secondary"
              />
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <StarsIcon className="size-9 shrink-0 text-primary" />
                  <div id={titleId} className="font-semibold text-body text-sm">
                    {title}
                  </div>
                </div>
                <div className="text-body-secondary text-xs leading-[1.125rem]">{description}</div>
              </div>
              <Button primary small fullWidth onClick={handleAcknowledge}>
                {t("Got it")}
              </Button>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  )
}

const Spotlight = ({ rect }: { rect: Rect }) => (
  <div
    className="absolute animate-fade-in rounded-sm shadow-[0_0_0_100vmax_rgb(0_0_0/0.72)]"
    style={{
      left: rect.x - SPOTLIGHT_PADDING,
      top: rect.y - SPOTLIGHT_PADDING,
      width: rect.width + SPOTLIGHT_PADDING * 2,
      height: rect.height + SPOTLIGHT_PADDING * 2,
    }}
  />
)
