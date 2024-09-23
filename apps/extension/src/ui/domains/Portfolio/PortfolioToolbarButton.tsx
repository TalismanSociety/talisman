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
        "bg-grey-900 hover:bg-grey-800 text-body-secondary flex items-center justify-center rounded-sm",
        "border-grey-700 @2xl:size-[4.4rem] size-[3.6rem] ring-transparent focus-visible:border",
        props.className
      )}
    />
  )
})
PortfolioToolbarButton.displayName = "ToolbarButton"
