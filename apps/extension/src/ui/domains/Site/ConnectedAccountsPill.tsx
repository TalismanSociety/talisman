import { FC, useMemo, useState } from "react"
import styled from "styled-components"
import { useCurrentSite } from "@ui/apps/popup/context/CurrentSiteContext"
import useAccounts from "@ui/hooks/useAccounts"
import { ConnectedAccountsDrawer } from "@ui/domains/Site/ConnectedAccountsDrawer"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"

const Container = styled.button`
  background: var(--color-background-muted);
  padding: 0.5rem 0.8rem;
  border-radius: 4.8rem;
  font-weight: var(--font-weight-regular);
  color: var(--color-mid);
  outline: none;
  border: none;
  cursor: pointer;

  .dot {
    display: inline-block;
    height: 0.8em;
    width: 0.8em;
    border-radius: 50%;
    margin-right: 0.6rem;
    background: var(--color-status-error);
  }

  &.connected .dot {
    background: var(--color-status-connected);
  }

  :hover {
    background: var(--color-background-muted-3x);
    color: var(--color-foreground-muted-2x);
  }
`

export const ConnectedAccountsPill: FC = () => {
  const currentSite = useCurrentSite()
  const accounts = useAccounts()
  const authorisedSites = useAuthorisedSites()
  const site = authorisedSites[currentSite?.id!]

  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false)

  const { count, label } = useMemo(() => {
    const connected = [...new Set([...(site?.addresses ?? []), ...(site?.ethAddresses ?? [])])]

    //if addresses is undefined or has length of 0, site has not been marked as trusted by the user
    if (connected.length === 0) return { count: 0, label: "Not connected" }

    const count = connected.filter((ca) => accounts.some(({ address }) => address === ca)).length
    const label = accounts.length === 1 && count === 1 ? "Connected" : `${count} connected`

    return { count, label }
  }, [accounts, site?.addresses, site?.ethAddresses])

  if (!site) return null

  return (
    <>
      <Container
        className={count ? "connected" : undefined}
        onClick={() => setShowConnectedAccounts(true)}
      >
        <span className="dot"></span>
        {label}
      </Container>
      <ConnectedAccountsDrawer
        open={showConnectedAccounts}
        onClose={() => setShowConnectedAccounts(false)}
      />
    </>
  )
}
