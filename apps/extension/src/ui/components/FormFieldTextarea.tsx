import { classNames } from "@ui/util/cn"
import { type DetailedHTMLProps, forwardRef, type TextareaHTMLAttributes } from "react"

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
          "w-full resize-none rounded border border-transparent bg-field px-12 py-8 font-light text-grey-300 text-md placeholder:text-body-disabled focus-within:border-grey-600 focus:text-body disabled:text-body-disabled",
          props.className
        )}
        {...props}
      />
    )
  }
)
FormFieldTextarea.displayName = "FormFieldTextarea"
