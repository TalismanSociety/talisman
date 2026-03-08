import { classNames } from "@talismn/util"
import { type ButtonHTMLAttributes, type DetailedHTMLProps, forwardRef } from "react"

type ListButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>

export const ListButton = forwardRef<HTMLButtonElement, ListButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      className={classNames(
        "allow-focus flex h-28 w-full items-center gap-6 rounded-sm bg-grey-800 px-8 text-left text-body-secondary hover:bg-grey-700 hover:text-body",
        className
      )}
      ref={ref}
      type="button"
      {...props}
    />
  )
)
ListButton.displayName = "ListButton"
