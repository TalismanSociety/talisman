import { SIGNING_TYPES } from "@core/domains/signing/types"
import { useRequests } from "@ui/hooks/useRequests"
import { useMemo } from "react"
import styled from "styled-components"

const Container = styled.span`
  color: var(--color-background-muted-2x);
  font-size: var(--font-size-small);
  line-height: var(--font-size-small);
  font-weight: var(--font-weight-regular);
`

export const PendingRequests = () => {
  const allRequests = useRequests()

  const pendingRequests = useMemo(() => {
    const signingCount = allRequests.filter((req) => req.type in SIGNING_TYPES).length
    return signingCount ? `${signingCount} Pending Request${signingCount > 1 ? "s" : ""}` : null
  }, [allRequests])

  return <Container className="pending-requests">{pendingRequests}</Container>
}
