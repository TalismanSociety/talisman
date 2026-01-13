import { classNames } from "@talismn/util"
import type { ButtonHTMLAttributes } from "react"

export const Button = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={classNames(
      "rounded-sm bg-black-tertiary p-4 hover:bg-opacity-80 active:bg-opacity-65",
      className
    )}
    {...props}
  />
)
