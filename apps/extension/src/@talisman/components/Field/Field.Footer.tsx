import styled from "styled-components"

interface IProps {
  message?: string
  extra?: string
  className?: string
}

const FieldFooter = ({ extra, message, className }: IProps) =>
  !extra && !message ? null : (
    <div className={`field-footer ${className}`}>
      <span className="extra">{extra}</span>
      <span className="message">{message}</span>
    </div>
  )

const StyledFieldFooter = styled(FieldFooter)`
  width: 100%;
  font-size: var(--font-size-xxsmall);
  text-transform: uppercase;
  color: var(--color-mid);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
`

export default StyledFieldFooter
