import { classNames } from "@talismn/util"
import { type ButtonHTMLAttributes, forwardRef } from "react"

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref">

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, type = "button", className, ...rest }, ref) => (
    <button
      ref={ref}
      className={classNames(
        "inline-block shrink-0 p-0 text-body-secondary text-lg enabled:hover:text-body disabled:opacity-50",
        className
      )}
      type={type}
      {...rest}
    >
      {children}
    </button>
  )
)
IconButton.displayName = "IconButton"
