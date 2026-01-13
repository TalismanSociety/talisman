import { classNames } from "@talismn/util"
import { type ButtonHTMLAttributes, type DetailedHTMLProps, forwardRef } from "react"

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
        "flex items-center justify-center rounded-sm border-content bg-grey-900 text-body-secondary hover:bg-grey-800",
        "size-16 border border-transparent ring-transparent focus-visible:border-grey-700",
        props.className
      )}
    />
  )
})
PortfolioToolbarButton.displayName = "ToolbarButton"
