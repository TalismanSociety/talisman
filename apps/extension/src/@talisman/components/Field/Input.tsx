import Field, { IFieldProps, fieldDefaultProps } from "./Field"

const Input = ({ value, onChange, fieldProps, ...rest }: IFieldProps) => (
  <Field {...rest}>
    <input
      type="text"
      onChange={(e) => onChange(e?.target?.value)}
      value={value}
      {...fieldProps}
      spellCheck={false}
    />
  </Field>
)

Input.defaultProps = fieldDefaultProps

export default Input
