import { classNames } from "@talismn/util"
import {
  DetailedHTMLProps,
  FC,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  Ref,
} from "react"

export type CheckboxProps = DetailedHTMLProps<
  InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
> & {
  inputRef?: Ref<HTMLInputElement>
  containerProps?: DetailedHTMLProps<LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>
  childProps?: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>
}

export const Checkbox: FC<CheckboxProps> = ({
  disabled,
  className,
  children,
  containerProps = {},
  childProps = {},
  inputRef,
  ...inputProps
}) => {
  return (
    <label
      className={classNames(
        "inline-flex items-center justify-start gap-[0.5em]",
        !disabled && "cursor-pointer",
        containerProps?.className && containerProps.className
      )}
      {...containerProps}
    >
      <input
        type="checkbox"
        className={classNames(
          "form-checkbox rounded-xs border-body-secondary text-grey-800 h-[1.2em] w-[1.2em] cursor-pointer border bg-transparent",
          "checked:hover:border-body-secondary checked:active hover:border-white checked:active:focus-visible:border-transparent",
          "active:bg-grey-700",
          "focus-visible:border-transparent focus-visible:shadow-none focus-visible:outline-offset-0 focus-visible:outline-white focus-visible:ring-0",
          "disabled:checked:bg-grey-700 disabled:border-body-disabled disabled:cursor-default disabled:bg-transparent disabled:checked:border-transparent",
          className
        )}
        ref={inputRef}
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
