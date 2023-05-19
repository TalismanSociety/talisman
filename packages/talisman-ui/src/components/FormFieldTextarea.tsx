import { classNames } from "@talismn/util"
import { DetailedHTMLProps, TextareaHTMLAttributes, forwardRef } from "react"

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
          "focus:text-body placeholder:text-body-disabled ring-grey-600 text-grey-300 bg-field text-md disabled:text-body-disabled w-full resize-none rounded px-12 py-8 font-light focus:ring-1",
          props.className
        )}
        {...props}
      />
    )
  }
)
FormFieldTextarea.displayName = "FormFieldTextarea"
