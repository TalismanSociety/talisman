import { classNames } from "@talismn/util"
import {
  type DetailedHTMLProps,
  type FC,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
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
        "flex w-full items-center gap-4 rounded border border-transparent bg-field px-12 font-light text-grey-300 text-md leading-none focus-within:border-grey-600",
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
            "h-full min-w-0 grow bg-transparent placeholder:text-body-disabled focus:text-body focus-visible:outline-none disabled:text-body-disabled",
            props.className
          )}
        />
        {after}
      </FormFieldInputContainer>
    )
  }
)
FormFieldInputText.displayName = "FormFieldInputText"
