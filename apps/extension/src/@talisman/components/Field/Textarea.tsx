// @ts-nocheck
import styled from "styled-components"

import Field, { IFieldProps, fieldDefaultProps } from "./Field"

const defaultProps: IFieldProps = {
  ...fieldDefaultProps,
}

const Textarea = ({ value, onChange, fieldProps, ...rest }: IFieldProps) => (
  <Field {...rest}>
    <textarea
      type="textarea"
      onChange={(e) => onChange(e?.target?.value)}
      data-lpignore="true"
      spellCheck="false"
      value={value}
      {...fieldProps}
    />
  </Field>
)

const StyledTextarea = styled(Textarea)`
  textarea {
    resize: none;
    display: block;
  }
`

StyledTextarea.defaultProps = defaultProps

export default StyledTextarea
