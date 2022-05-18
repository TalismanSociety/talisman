// @ts-nocheck
import { useState, useEffect } from "react"
import styled from "styled-components"
import { passwordStrength } from "check-password-strength"
import Field, { IFieldProps, fieldDefaultProps } from "./Field"
import Circle from "@talisman/components/Circle"
import { ReactComponent as KeyIcon } from "@talisman/theme/icons/key.svg"

interface IProps extends IFieldProps {
  showStrengthIndicator?: null | boolean
  showIcon?: null | boolean
}

const defaultProps: IProps = {
  ...fieldDefaultProps,
}

const Input = styled(
  ({ value, onChange, fieldProps, showStrengthIndicator, showIcon, ...rest }: IProps) => {
    const [strength, setStrength] = useState(0)

    // strength values are:
    // 0: no text
    // 1: too weak
    // 2: weak
    // 3: medium
    // 4: strong
    useEffect(() => {
      setStrength(
        (value?.length || 0) <= 0 ? 0 : (100 / 4) * ((passwordStrength(value)?.id || 0) + 1)
      )
    }, [value])

    return (
      <Field
        prefix={!!showIcon && <KeyIcon />}
        suffix={
          !!showStrengthIndicator && (
            <span data-strength={passwordStrength(value)?.id}>
              <Circle progress={strength} />
            </span>
          )
        }
        {...rest}
      >
        <input
          type="password"
          onChange={(e) => onChange(e?.target?.value)}
          value={value}
          {...fieldProps}
        />
      </Field>
    )
  }
)`
  .suffix > span {
    &[data-strength="0"] .progress {
      stroke: var(--color-status-error);
    }
    &[data-strength="1"] .progress {
      stroke: var(--color-status-concern);
    }
    &[data-strength="2"] .progress {
      stroke: yellow;
    }
    &[data-strength="3"] .progress {
      stroke: var(--color-status-success);
    }
  }
`

Input.defaultProps = defaultProps

export default Input
