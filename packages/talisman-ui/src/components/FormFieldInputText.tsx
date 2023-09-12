import { classNames } from "@talismn/util"
import {
  DetailedHTMLProps,
  FC,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  forwardRef,
} from "react"

export type FormFieldInputContainerProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  small?: boolean
}

export const FormFieldInputContainer: FC<FormFieldInputContainerProps> = ({
  small,
  className,
  ...props
}) => {
  return (
    <div
      {...props}
      className={classNames(
        "text-grey-300 bg-field text-md ring-grey-600 flex w-full items-center gap-4 rounded px-12 font-light leading-none focus-within:ring-1",
        small ? "h-24" : "h-28",
        className
      )}
    />
  )
}

export type FormFieldInputTextProps = DetailedHTMLProps<
  InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
> & {
  containerProps?: FormFieldInputContainerProps
  before?: ReactNode
  after?: ReactNode
  small?: boolean
}

export const FormFieldInputText = forwardRef<HTMLInputElement, FormFieldInputTextProps>(
  ({ containerProps, small, before, after, ...props }, ref) => {
    return (
      <FormFieldInputContainer small={small} {...containerProps}>
        {before}
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          data-lpignore
          ref={ref}
          {...props}
          className={classNames(
            "focus:text-body placeholder:text-body-disabled disabled:text-body-disabled h-full min-w-0 grow bg-transparent focus-visible:outline-none",
            props.className
          )}
        />
        {after}
      </FormFieldInputContainer>
    )
  }
)
FormFieldInputText.displayName = "FormFieldInputText"
