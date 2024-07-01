import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  Placement,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useMergeRefs,
  useRole,
} from "@floating-ui/react"
import {
  cloneElement,
  createContext,
  Dispatch,
  forwardRef,
  HTMLProps,
  isValidElement,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react"

export type PopoverOptions = {
  initialOpen?: boolean
  placement?: Placement
  modal?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Needed because of https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1519138189 */
export type UsePopoverReturnType = ReturnType<typeof useInteractions> &
  ReturnType<typeof useFloating> & {
    open: boolean
    setOpen: (open: boolean) => void
    modal?: boolean
    labelId?: string
    descriptionId?: string
    setLabelId: Dispatch<SetStateAction<string | undefined>>
    setDescriptionId: Dispatch<SetStateAction<string | undefined>>
  }

export function usePopover({
  initialOpen = false,
  placement = "bottom",
  modal,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: PopoverOptions = {}): UsePopoverReturnType {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen)
  const [labelId, setLabelId] = useState<string | undefined>()
  const [descriptionId, setDescriptionId] = useState<string | undefined>()

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
        crossAxis: placement.includes("-"),
        fallbackAxisSideDirection: "end",
        padding: 5,
      }),
      shift({ padding: 5 }),
    ],
  })

  const context = data.context

  const click = useClick(context, {
    enabled: controlledOpen == null,
  })
  const dismiss = useDismiss(context)
  const role = useRole(context)

  const interactions = useInteractions([click, dismiss, role])

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
      modal,
      labelId,
      descriptionId,
      setLabelId,
      setDescriptionId,
    }),
    [open, setOpen, interactions, data, modal, labelId, descriptionId]
  )
}

type ContextType =
  | (ReturnType<typeof usePopover> & {
      setLabelId: Dispatch<SetStateAction<string | undefined>>
      setDescriptionId: Dispatch<SetStateAction<string | undefined>>
    })
  | null

const PopoverContext = createContext<ContextType>(null)

export const usePopoverContext: () => NonNullable<ContextType> = () => {
  const context = useContext(PopoverContext)

  if (context == null) {
    throw new Error("Popover components must be wrapped in <Popover />")
  }

  return context
}

export function Popover({
  children,
  modal = false,
  ...restOptions
}: {
  children: ReactNode
} & PopoverOptions) {
  // This can accept any props as options, e.g. `placement`,
  // or other positioning options.
  const popover = usePopover({ modal, ...restOptions })
  return <PopoverContext.Provider value={popover}>{children}</PopoverContext.Provider>
}

export interface PopoverTriggerProps {
  children: ReactNode
  asChild?: boolean
}

export const PopoverTrigger = forwardRef<HTMLElement, HTMLProps<HTMLElement> & PopoverTriggerProps>(
  function PopoverTrigger({ children, asChild = false, ...props }, propRef) {
    const context = usePopoverContext()
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
        type="button"
        // The user can style the trigger based on the state
        data-state={context.open ? "open" : "closed"}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...context.getReferenceProps({ ...props, crossOrigin: props.crossOrigin as any })}
      >
        {children}
      </button>
    )
  }
)

export const PopoverContent = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(
  function PopoverContent(props, propRef) {
    const { context: floatingContext, ...context } = usePopoverContext()
    const ref = useMergeRefs([context.refs.setFloating, propRef])

    if (!floatingContext.open) return null

    return (
      <FloatingPortal>
        <FloatingFocusManager context={floatingContext} modal={context.modal}>
          <div
            ref={ref}
            style={{
              ...context.floatingStyles,
              ...props.style,
            }}
            aria-labelledby={context.labelId}
            aria-describedby={context.descriptionId}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...context.getFloatingProps({ ...props, crossOrigin: props.crossOrigin as any })}
          >
            {props.children}
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    )
  }
)
