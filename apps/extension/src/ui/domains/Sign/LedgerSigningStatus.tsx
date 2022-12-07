import Button from "@talisman/components/Button"
import { AlertCircleIcon, LoaderIcon } from "@talisman/theme/icons"
import styled from "styled-components"

const Container = styled.div<{ status?: string }>`
  background: var(--color-background-muted);
  padding: 2.4rem;
  border-radius: 2.4rem 2.4rem 0px 0px;
  color: var(--color-mid);
  font-size: var(--font-size-small);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  line-height: 1;
  svg {
    font-size: 3rem;
    min-width: 1em;
    line-height: 3rem;
    ${(props) => (props.status ? `color: var(--color-status-${props.status});` : "")};
  }
  button {
    margin-top: 2.4rem;
    width: 100%;
  }
  span {
    line-height: 2rem !important;
  }
`

interface LedgerSigningStatusProps {
  message: string
  requiresConfirmation?: boolean
  status?: "error" | "signing"
  confirm?: (args: any) => void
}

export const LedgerSigningStatus = ({
  status,
  message,
  requiresConfirmation = true,
  confirm = () => {},
}: LedgerSigningStatusProps) => {
  return (
    <Container status={status === "error" ? status : ""}>
      {status === "error" && (
        <>
          <AlertCircleIcon />
          <span>{message}</span>
        </>
      )}
      {status === "signing" && (
        <>
          <LoaderIcon data-spin />
          <span>Sign with Ledger...</span>
        </>
      )}
      {status === "error" && requiresConfirmation && confirm && (
        <Button primary onClick={confirm}>
          {"OK"}
        </Button>
      )}
    </Container>
  )
}
