import { ReactNode } from "react"
import styled from "styled-components"

export interface IProps {
  label?: ReactNode
  info?: string
  message?: string
  className?: string
}

const FieldHeader = ({ label, info, className }: IProps) =>
  !label && !info ? null : (
    <div className={`field-header ${className}`}>
      {!!label && <span className="label">{label}</span>}
      {!!info && <span className="info">{info}</span>}
    </div>
  )

const StyledFieldHeader = styled(FieldHeader)`
  width: 100%;
  font-size: var(--font-size-normal);
  //text-transform: uppercase;

  > span {
    display: block;

    &.label {
      font-size: var(--font-size-normal);
      color: var(--color-mid);
    }

    &.info {
      font-size: var(--font-size-small);
      color: var(--color-background-muted-2x);
      margin: 0.1em 0 0 0;
    }
  }

  & + .children {
    margin-top: 2rem;
  }
`

export default StyledFieldHeader
