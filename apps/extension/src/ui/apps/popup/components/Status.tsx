import { ReactComponent as Logo } from "@talisman/theme/logos/logo-hand-color.svg"
import styled from "styled-components"

interface IProps {
  text?: string
  className?: string
}

const Status = ({ text, className }: IProps) => (
  <div className={className}>
    <Logo className="logo" />
    <h2 data-extended>{text}</h2>
  </div>
)

const StyledStatus = styled(Status)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .logo {
    font-size: 16rem;
  }

  h2 {
    font-size: var(--font-size-medium);
    font-weight: bold;
    margin-top: 1em;
  }
`

export default StyledStatus
