import { DetailedHTMLProps, FC, TextareaHTMLAttributes, forwardRef } from "react"

import { classNames } from "../utils"

type FormFieldTextareaProps = DetailedHTMLProps<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  HTMLTextAreaElement
>

export const FormFieldTextarea = forwardRef<HTMLTextAreaElement, FormFieldTextareaProps>(
  (props, ref) => {
    return (
      <textarea
        ref={ref}
        className={classNames(
          "focus:text-body placeholder:text-body-disabled ring-grey-600 text-grey-300 bg-field text-md disabled:text-body-disabled w-full resize-none rounded bg-transparent py-8 px-12 font-light focus:ring-1",
          props.className
        )}
        {...props}
      />
    )
  }
)
