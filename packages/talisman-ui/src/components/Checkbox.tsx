import { FC, ReactNode } from "react"
import { classNames } from "../utils"

export type CheckboxProps = {
  children: ReactNode
  className?: string
  inputProps?: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
  disabled?: boolean
}

export const Checkbox: FC<CheckboxProps> = ({ disabled, className, inputProps = {}, children }) => {
  return (
    <label className={classNames("inline-flex items-center justify-start gap-[0.5em]", className)}>
      <input
        type="checkbox"
        className={classNames(
          "form-checkbox rounded-xs border-body-secondary text-grey-800 h-[1.2em] w-[1.2em] cursor-pointer border  bg-transparent",
          "checked:hover:border-body-secondary  checked:active hover:border-white checked:active:focus-visible:border-transparent",
          "active:bg-grey-700",
          "focus-visible:border-transparent focus-visible:shadow-none focus-visible:outline-offset-0 focus-visible:outline-white focus-visible:ring-0",
          "disabled:checked:bg-grey-700 disabled:border-body-disabled disabled:cursor-default disabled:bg-transparent disabled:checked:border-transparent",
          inputProps.className
        )}
        disabled={disabled ?? inputProps.disabled}
        {...inputProps}
      />
      <span className={classNames("text-left", disabled && "text-body-disabled")}>{children}</span>
    </label>
  )
}
