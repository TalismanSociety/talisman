import { FC } from "react"
import { FieldError } from "react-hook-form"
import Field, { IFieldWrapperProps } from "./Field"

type Props = IFieldWrapperProps & {
  error?: FieldError
}

export const FormField: FC<Props> = ({ error, ...props }) => (
  <Field {...props} message={error?.message} status={error ? "ERROR" : undefined} />
)
