import { classNames } from "@talismn/util"
import { ButtonHTMLAttributes, DetailedHTMLProps, forwardRef } from "react"

export const PortfolioToolbarButton = forwardRef<
  HTMLButtonElement,
  DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
>((props, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={classNames(
        "bg-grey-900 hover:bg-grey-800 text-body-secondary flex size-[3.6rem] items-center justify-center rounded-sm",
        "ring-body-disabled focus-visible:ring-1",
        props.className
      )}
    />
  )
})
PortfolioToolbarButton.displayName = "ToolbarButton"
