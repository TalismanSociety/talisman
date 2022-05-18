import Field, { IFieldProps, fieldDefaultProps } from "./Field"
import styled from "styled-components"

type InputAutoWidthProps = Omit<IFieldProps, "onChange">

export default function InputAutoWidth({
  value = "",
  //onChange, //use the fieldProps one which doesn't alter signature
  fieldProps,
  ...rest
}: InputAutoWidthProps) {
  return (
    <Field {...rest}>
      <InputWrapper>
        <InputWidthCalculator>{value ?? fieldProps?.placeholder ?? ""}</InputWidthCalculator>
        <input type="text" value={value} {...fieldProps} spellCheck={false} />
      </InputWrapper>
    </Field>
  )
}

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;

  > input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  /* Chrome, Safari, Edge, Opera */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &&& {
    input:invalid,
    input:invalid:hover {
      color: var(--color-status-error);
    }
  }
  /* Firefox */
  input[type="number"] {
    -moz-appearance: textfield;
  }
`
const InputWidthCalculator = styled(({ className, ...props }) => (
  <span className={`${className} input-auto-width`} {...props} />
))`
  &&& {
    color: transparent;
  }
`

InputAutoWidth.defaultProps = fieldDefaultProps
