import { useEffect } from "react"
import styled from "styled-components"
import Field, { IFieldProps, fieldDefaultProps } from "./Field"
import { ReactComponent as ChevronIcon } from "@talisman/theme/icons/chevron-down.svg"

export interface IProps extends IFieldProps {
  options: { key: string; value: string }[]
}

const Select = ({ value, options, onChange, fieldProps, ...rest }: IProps) => {
  // if there's not value selected, use the first one by default
  useEffect(() => {
    if (!value && !!options.length) onChange(options[0].key)
  }, [value, options, onChange])

  return (
    <Field {...rest}>
      <select onChange={(e) => onChange(e?.target?.value)} {...fieldProps}>
        {options.map(({ key, value }) => (
          <option key={key} value={key}>
            {value}
          </option>
        ))}
      </select>
      <ChevronIcon className="chevron" />
    </Field>
  )
}

const StyledSelect = styled(Select)`
  .children {
    > select {
      appearance: none;
      background-color: transparent;
      border: none;
      padding-right: 2.1em;
    }

    .chevron {
      position: absolute;
      top: 50%;
      right: 0.6em;
      font-size: 0.6em;
      line-height: 1em;
      transform: translateY(-50%);
      pointer-events: none;
      opacity: 0.5;
    }
  }
`

StyledSelect.defaultProps = fieldDefaultProps

export default StyledSelect
