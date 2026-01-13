import type { Placement } from "@floating-ui/react"
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
} from "@floating-ui/react"
import {
  cloneElement,
  createContext,
  forwardRef,
  HTMLProps,
  isValidElement,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react"

interface TooltipOptions {
  initialOpen?: boolean
  placement?: Placement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  delay?: number
}

/** Needed because of https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1519138189 */
export type UseTooltipReturnType = ReturnType<typeof useInteractions> &
  ReturnType<typeof useFloating> & {
    open: boolean
    setOpen: (open: boolean) => void
  }

export function useTooltip({
  initialOpen = false,
  placement = "bottom",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  delay = 250,
}: TooltipOptions = {}): UseTooltipReturnType {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen)

  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = setControlledOpen ?? setUncontrolledOpen

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(5),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift({ padding: 5 }),
    ],
  })

  const context = data.context

  const hover = useHover(context, {
    move: false,
    enabled: controlledOpen == null,
    delay: {
      open: delay,
      // delay on close has side-effects, don't use it
    },
  })
  const focus = useFocus(context, {
    enabled: controlledOpen == null,
  })
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: "tooltip" })

  const interactions = useInteractions([hover, focus, dismiss, role])

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
    }),
    [open, setOpen, interactions, data]
  )
}

type ContextType = ReturnType<typeof useTooltip> | null

const TooltipContext = createContext<ContextType>(null)

export const useTooltipContext = (): NonNullable<ContextType> => {
  const context = useContext(TooltipContext)

  if (context == null) {
    throw new Error("Tooltip components must be wrapped in <Tooltip />")
  }

  return context
}

export function Tooltip({ children, ...options }: { children: ReactNode } & TooltipOptions) {
  // This can accept any props as options, e.g. `placement`,
  // or other positioning options.
  const tooltip = useTooltip(options)
  return <TooltipContext.Provider value={tooltip}>{children}</TooltipContext.Provider>
}

export const TooltipTrigger = forwardRef<
  HTMLElement,
  HTMLProps<HTMLElement> & { asChild?: boolean }
>(function TooltipTrigger({ children, asChild = false, ...props }, propRef) {
  const context = useTooltipContext()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childrenRef = (children as any).ref
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef])

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && isValidElement(children)) {
    return cloneElement(
      children,
      context.getReferenceProps({
        ref,
        ...props,
        ...children.props,
        "data-state": context.open ? "open" : "closed",
      })
    )
  }

  return (
    <button
      ref={ref}
      // The user can style the trigger based on the state
      data-state={context.open ? "open" : "closed"}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...context.getReferenceProps({ ...props, crossOrigin: props.crossOrigin as any })}
    >
      {children}
    </button>
  )
})

export const TooltipContent = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(
  function TooltipContent(
    {
      className = "rounded-xs text-body-secondary border-grey-700 z-20 border-[0.5px] bg-black p-3 text-xs shadow",
      ...props
    },
    propRef
  ) {
    const context = useTooltipContext()
    const ref = useMergeRefs([context.refs.setFloating, propRef])

    return (
      <FloatingPortal>
        {context.open && (
          <div
            ref={ref}
            className={className}
            style={{
              position: context.strategy,
              top: context.y ?? 0,
              left: context.x ?? 0,
              visibility: context.x == null ? "hidden" : "visible",
              ...props.style,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...context.getFloatingProps({ ...props, crossOrigin: props.crossOrigin as any })}
          />
        )}
      </FloatingPortal>
    )
  }
)
