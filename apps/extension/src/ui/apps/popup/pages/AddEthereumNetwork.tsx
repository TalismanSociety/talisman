import { AppPill } from "@talisman/components/AppPill"
import StyledGrid from "@talisman/components/Grid"
import { IconButton } from "@talisman/components/IconButton"
import { notify } from "@talisman/components/Notifications"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { GlobeIcon, XIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { NetworksDetailsButton } from "@ui/domains/Ethereum/NetworkDetailsButton"
import { useEthNetworkAddRequestById } from "@ui/hooks/useEthNetworkAddRequestById"
import { useCallback } from "react"
import { useParams } from "react-router-dom"
import styled from "styled-components"

import Layout, { Content, Footer, Header } from "../Layout"

const Container = styled(Layout)`
  .layout-content .children {
    color: var(--color-mid);
    text-align: center;
    display: flex;
    flex-direction: column;
    height: 100%;

    .grow {
      flex-grow: 1;
    }

    h1 {
      margin: 1.6rem 0 2.4rem 0;
      color: var(--color-foreground);
      font-size: var(--font-size-medium);
      line-height: var(--font-size-medium);
      font-weight: var(--font-weight-bold);
    }

    h2 {
      font-size: var(--font-size-normal);
      line-height: var(--font-size-xlarge);
      padding: 0 2rem;
      text-align: left;
    }

    strong {
      color: var(--color-foreground);
      background: var(--color-background-muted);
      padding: 0.4rem 1.2rem;
      border-radius: 4.8rem;
      font-weight: var(--font-weight-normal);
    }

    .bottom {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .error {
      color: var(--color-status-error);
      text-align: left;
      margin-top: 1rem;
    }
  }

  ${StyledGrid} ${SimpleButton} {
    width: auto;
  }

  .globeIcon {
    margin-top: 1.2rem;
    font-size: 4rem;
    color: var(--color-primary);
  }
`

export const AddEthereumNetwork = () => {
  const { id } = useParams<"id">()
  const request = useEthNetworkAddRequestById(id)

  const approve = useCallback(async () => {
    if (!request) return
    try {
      await api.ethNetworkAddApprove(request.id)
      window.close()
    } catch (err) {
      notify({ type: "error", title: "Failed to add network", subtitle: (err as Error).message })
    }
  }, [request])

  const cancel = useCallback(() => {
    if (!request) return
    api.ethNetworkAddCancel(request.id)
    window.close()
  }, [request])

  if (!request) return null

  return (
    <Container>
      <Header
        text={<AppPill url={request.url} />}
        nav={
          <IconButton onClick={cancel}>
            <XIcon />
          </IconButton>
        }
      />
      <Content>
        <div>
          <GlobeIcon className="globeIcon inline-block" />
        </div>
        <h1>Add Network</h1>
        <p>
          This app wants to connect Talisman to the <strong>{request.network.chainName}</strong>{" "}
          network.
        </p>
        <div className="grow"></div>
        <div>
          <NetworksDetailsButton network={request.network} />
        </div>
      </Content>
      <Footer>
        <StyledGrid>
          <SimpleButton onClick={cancel}>Reject</SimpleButton>
          <SimpleButton primary onClick={approve}>
            Approve
          </SimpleButton>
        </StyledGrid>
      </Footer>
    </Container>
  )
}
