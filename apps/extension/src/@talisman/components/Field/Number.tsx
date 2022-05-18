import Field, { IFieldProps, fieldDefaultProps } from "./Field"

const Input = ({ value, onChange, fieldProps, ...rest }: IFieldProps) => (
  <Field {...rest}>
    <input
      type="number"
      onChange={(e) => onChange(e?.target?.value)}
      value={value}
      {...fieldProps}
    />
  </Field>
)

Input.defaultProps = fieldDefaultProps

export default Input
