import {
  DetailedHTMLProps,
  FC,
  forwardRef,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react"
import { classNames } from "../utils"

type FormFieldInputContainerProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  small?: boolean
}

export const FormFieldInputContainer: FC<FormFieldInputContainerProps> = (props) => {
  return (
    <div
      {...props}
      className={classNames(
        "placeholder:text-body-disabled text-body-secondary bg-field text-md ring-grey-600 flex w-full items-center gap-4 rounded px-12 font-light leading-none focus-within:ring-1",
        props.small ? "h-24" : "h-28",
        props.className
      )}
    />
  )
}

type FormFieldInputTextProps = DetailedHTMLProps<
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
          className={classNames("h-full min-w-0 grow bg-transparent", props.className)}
        />
        {after}
      </FormFieldInputContainer>
    )
  }
)
