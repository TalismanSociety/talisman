import { classNames } from "@talismn/util"
import { DetailedHTMLProps, forwardRef, TextareaHTMLAttributes } from "react"

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
          "focus:text-body placeholder:text-body-disabled focus-within:border-grey-600 text-grey-300 bg-field text-md disabled:text-body-disabled w-full resize-none rounded border border-transparent px-12 py-8 font-light",
          props.className,
        )}
        {...props}
      />
    )
  },
)
FormFieldTextarea.displayName = "FormFieldTextarea"
