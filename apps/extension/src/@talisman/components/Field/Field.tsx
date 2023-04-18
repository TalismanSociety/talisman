/* eslint-disable jsx-a11y/no-static-element-interactions */
import { scrollbarsStyle } from "@talisman/theme/styles"
import { PropsWithChildren } from "react"
import styled from "styled-components"

import FieldFooter from "./Field.Footer"
import FieldHeader from "./Field.Header"

export interface IFieldWrapperProps extends PropsWithChildren<any> {
  prefix?: any
  suffix?: any
  label?: string
  info?: string
  extra?: string
  message?: string
  inline?: boolean
  className?: string
  disabled?: boolean
  status?: string
  onClick?: (e: any) => any
}

export interface IFieldProps<T = string | number>
  extends IFieldWrapperProps,
    PropsWithChildren<any> {
  value?: T
  fieldProps?: any
  onChange: (val?: any) => void
  id?: string
}

export const fieldDefaultProps = {
  onChange: (val?: any) => {},
}

export const fieldWrapperDefaultProps = {}

const Field = ({
  label,
  info,
  extra,
  message,
  prefix,
  suffix,
  onClick,
  children,
  className,
}: IFieldWrapperProps) => (
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
  <div className={`field ${className}`} onClick={onClick}>
    <FieldHeader label={label} info={info} />
    <span className="children">
      {!!prefix && <span className="prefix">{prefix}</span>}
      {children}
      {!!suffix && <span className="suffix">{suffix}</span>}
    </span>
    <FieldFooter extra={extra} message={message} />
  </div>
)

/** @deprecated Please don't :) */
const StyledField = styled(Field)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  > .children {
    border: none;
    border-radius: var(--border-radius);
    display: block;
    width: 100%;
    background: var(--color-background-muted);

    .prefix,
    .suffix {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.4;
      pointer-events: none;
      > * {
        display: block;
        width: 1.5em;
        height: 1.5em;
      }
    }

    .prefix {
      left: 1em;
    }
    .suffix {
      right: 1em;
    }

    input,
    .input-auto-width,
    select,
    textarea {
      border: none;
      padding: 1.1rem 2rem;
      width: 100%;
      color: rgb(${({ theme }) => theme.mid});
      background: transparent;
      text-align: inherit;
      display: block;
      ${({ prefix }) => !!prefix && `padding-left: 5rem;`}
      ${({ suffix }) => !!suffix && `padding-right: 5rem;`}

      ${scrollbarsStyle("var(--color-background-muted-3x)")}
    }

    textarea {
      resize: none;
      display: block;
    }

    select {
      cursor: pointer;
    }

    .dropdown,
    .dropdown button {
      width: 100%;
    }
  }

  > .field-footer {
    position: absolute;
    top: calc(100% + 0.5em);
    padding: 0 1em;
  }

  ${({ inline }) =>
    !!inline &&
    `
    flex-direction: row;
    label{
      margin-right: 0.4em;
    }

    >.children{
      margin-top: 0;
    }
  `};

  ${({ disabled }) =>
    !!disabled &&
    `
    opacity: 0.7;

    >.children{
      pointer-events: none;
    }
    
    &:after{
      content: '';
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      position: absolute;
      cursor: not-allowed
    }
  `};

  ${({ status }) =>
    status === "ERROR" &&
    `
    >.field-footer .message{
      color: var(--color-status-warning);
    }
  `};
`

StyledField.defaultProps = fieldWrapperDefaultProps

export default StyledField
