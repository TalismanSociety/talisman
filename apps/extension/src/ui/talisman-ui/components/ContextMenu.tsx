import { CheckIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import {
  type ButtonHTMLAttributes,
  type FC,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useCallback,
} from "react"

import {
  Popover,
  PopoverContent,
  type PopoverOptions,
  PopoverTrigger,
  type PopoverTriggerProps,
  usePopoverContext,
} from "./Popover"

export const ContextMenu: FC<{ children: ReactNode } & PopoverOptions> = (props) => (
  <Popover {...props} />
)

export const ContextMenuTrigger = forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLElement> & PopoverTriggerProps
>((props, ref) => <PopoverTrigger {...props} ref={ref} />)
ContextMenuTrigger.displayName = "ContextMenuTrigger"

export const ContextMenuContent: FC<HTMLAttributes<HTMLDivElement>> = (props) => {
  return (
    <PopoverContent
      {...props}
      className="z-50 flex w-min flex-col whitespace-nowrap rounded-sm border border-grey-800 bg-black px-2 py-3 text-left text-sm shadow-lg"
    />
  )
}

export const ContextMenuItem: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  onClick,
  className,
  ...props
}) => {
  const { setOpen } = usePopoverContext()

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      setOpen(false)
    },
    [setOpen, onClick]
  )

  return (
    <button
      type="button"
      {...props}
      onClick={handleClick}
      className={classNames(
        "h-20 rounded-xs p-6 text-left focus-visible:bg-grey-800 enabled:hover:bg-grey-800 disabled:text-body-disabled",
        className
      )}
    />
  )
}

export const ContextMenuOptionItem: FC<{
  label: string
  selected: boolean
  onClick: () => void
}> = ({ label, selected, onClick }) => (
  <ContextMenuItem
    className={classNames(
      "flex items-center justify-between gap-16",
      selected ? "text-body" : "text-body-secondary"
    )}
    onClick={onClick}
  >
    <div>{label}</div>
    <CheckIcon className={classNames(selected ? "visible" : "invisible")} />
  </ContextMenuItem>
)
