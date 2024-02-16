import { classNames } from "@talismn/util"
import { ButtonHTMLAttributes } from "react"

export const Button = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={classNames(
      "bg-black-tertiary rounded-sm p-4 hover:bg-opacity-80 active:bg-opacity-65",
      className
    )}
    {...props}
  />
)
