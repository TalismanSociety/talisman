import { useCurrentSite } from "@ui/apps/popup/context/CurrentSiteContext"
import useAccounts from "@ui/hooks/useAccounts"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { FC, Suspense, lazy, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

import { NetworkLogo } from "../Ethereum/NetworkLogo"

const ConnectedAccountsDrawer = lazy(() => import("@ui/domains/Site/ConnectedAccountsDrawer"))

const Container = styled.button`
  display: flex;
  align-items: center;
  background: var(--color-background-muted);
  line-height: 2.8rem;
  border-radius: 4.8rem;
  font-weight: var(--font-weight-regular);
  color: var(--color-mid);
  outline: none;
  border: none;
  cursor: pointer;
  gap: 0.6rem;
  padding: 0 0.8rem;

  .dot {
    display: inline-block;
    height: 0.8em;
    width: 0.8em;
    border-radius: 50%;
    background: var(--color-status-error);
  }

  &.connected .dot {
    background: var(--color-status-connected);
  }

  :hover {
    background: var(--color-background-muted-3x);
    color: var(--color-foreground-muted-2x);
  }

  .network-logo {
    font-size: 1.6rem;
  }
`

export const ConnectedAccountsPill: FC = () => {
  const { t } = useTranslation()
  const currentSite = useCurrentSite()
  const accounts = useAccounts()
  const authorisedSites = useAuthorisedSites()
  const site = useMemo(
    () => (currentSite?.id ? authorisedSites[currentSite?.id] : null),
    [authorisedSites, currentSite?.id]
  )

  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false)

  const { count, label, ethChainId } = useMemo(() => {
    const { addresses = [], ethAddresses = [], ethChainId } = site || {}
    const connected = [...new Set([...addresses, ...ethAddresses])]

    //if addresses is undefined or has length of 0, site has not been marked as trusted by the user
    if (connected.length === 0) return { count: 0, label: t("Not connected"), ethChainId }

    const count = connected.filter((ca) => accounts.some(({ address }) => address === ca)).length
    const label =
      accounts.length === 1 && count === 1
        ? t("Connected")
        : t(`{{length}} connected`, { length: count })

    return { count, label, ethChainId }
  }, [accounts, site, t])

  if (!site) return null

  return (
    <>
      <Container
        className={count ? "connected" : undefined}
        onClick={() => setShowConnectedAccounts(true)}
      >
        <span className="dot"></span>
        <span className="label">{label}</span>
        {typeof ethChainId === "number" && <NetworkLogo ethChainId={ethChainId.toString()} />}
      </Container>
      <Suspense fallback={null}>
        <ConnectedAccountsDrawer
          open={showConnectedAccounts}
          onClose={() => setShowConnectedAccounts(false)}
        />
      </Suspense>
    </>
  )
}
