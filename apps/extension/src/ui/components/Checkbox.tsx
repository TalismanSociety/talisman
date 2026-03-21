import { classNames } from "@talismn/util"
import {
  type DetailedHTMLProps,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
} from "react"

export type CheckboxProps = DetailedHTMLProps<
  InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
> & {
  containerProps?: DetailedHTMLProps<LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>
  childProps?: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ disabled, className, children, containerProps = {}, childProps = {}, ...inputProps }, ref) => {
    return (
      <label
        className={classNames(
          "inline-flex items-center justify-start gap-[0.5em]",
          !disabled && "cursor-pointer",
          className
        )}
        {...containerProps}
      >
        <input
          type="checkbox"
          className={classNames(
            "form-checkbox h-[1.2em] w-[1.2em] cursor-pointer rounded-xs border border-body-secondary bg-transparent text-grey-800",
            "checked:active hover:border-white checked:hover:border-body-secondary checked:active:focus-visible:border-transparent",
            "active:bg-grey-700 enabled:focus-visible:border-white",
            "outline-0! ring-0! [&.form-checkbox]:focus:outline-0! [&.form-checkbox]:focus:outline-offset-0! [&.form-checkbox]:focus:ring-0! [&.form-checkbox]:focus:ring-offset-0",
            "disabled:cursor-default disabled:border-body-disabled disabled:bg-transparent disabled:checked:border-transparent disabled:checked:bg-grey-700"
          )}
          ref={ref}
          disabled={disabled}
          {...inputProps}
        />
        {children && (
          <span
            className={classNames(
              "text-left",
              disabled && "text-body-disabled",
              childProps.className
            )}
            {...childProps}
          >
            {children}
          </span>
        )}
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"
