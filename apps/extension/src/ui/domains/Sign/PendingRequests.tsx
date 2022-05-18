import { useSigningRequests } from "@ui/hooks/useSigningRequests"
import { useMemo } from "react"
import styled from "styled-components"

const Container = styled.span`
  color: var(--color-background-muted-2x);
  font-size: var(--font-size-small);
  line-height: var(--font-size-small);
  font-weight: var(--font-weight-regular);
`

export const PendingRequests = () => {
  const signingRequests = useSigningRequests()

  const pendingRequests = useMemo(() => {
    const count = signingRequests?.length > 0 ? signingRequests.length : 0
    return count ? `${count} Pending Request${count > 1 ? "s" : ""}` : null
  }, [signingRequests?.length])

  return <Container className="pending-requests">{pendingRequests}</Container>
}
