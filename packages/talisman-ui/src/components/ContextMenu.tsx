import { classNames } from "@talismn/util"
import {
  ButtonHTMLAttributes,
  FC,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
  forwardRef,
  useCallback,
} from "react"

import {
  Popover,
  PopoverContent,
  PopoverOptions,
  PopoverTrigger,
  PopoverTriggerProps,
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
      className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg"
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
      {...props}
      onClick={handleClick}
      className={classNames("hover:bg-grey-800 rounded-xs h-20 p-6 text-left", className)}
    />
  )
}
