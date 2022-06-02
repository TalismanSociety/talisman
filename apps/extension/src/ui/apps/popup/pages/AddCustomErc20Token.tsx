import { AppPill } from "@talisman/components/AppPill"
import StyledGrid from "@talisman/components/Grid"
import { IconButton } from "@talisman/components/IconButton"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { GlobeIcon, XIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { NetworkAddNotSupported } from "@ui/domains/Ethereum/NetworkAddNotSupported"
import useAuthorisedSiteById from "@ui/hooks/useAuthorisedSiteById"
import { useEthereumNetwork } from "@ui/hooks/useEthereumNetwork"
import { useEthWatchAssetRequests } from "@ui/hooks/useEthWatchAssetRequests"
import { useSettings } from "@ui/hooks/useSettings"
import { useCallback, useMemo } from "react"
import styled from "styled-components"
import Layout, { Content, Header, Footer } from "../Layout"

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
      // flex-grow: 1;
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

export const AddCustomErc20Token = () => {
  const requests = useEthWatchAssetRequests()

  const {
    requestId,
    //network,
    assetRequest,
    siteUrl,
  } = useMemo(
    () => ({
      requestId: requests?.[0]?.id,
      siteUrl: requests?.[0]?.url,
      assetRequest: requests?.[0].request,
      //network: requests?.[0]?.network,
    }),
    [requests]
  )

  const origin = useMemo(() => new URL(siteUrl).origin, [siteUrl])
  const { ethChainId } = useAuthorisedSiteById(origin, "ethereum")

  const network = useEthereumNetwork(ethChainId)

  const approve = useCallback(() => {
    api.ethWatchAssetRequestApprove(requestId)
    window.close()
  }, [requestId])

  const cancel = useCallback(() => {
    api.ethWatchAssetRequestCancel(requestId)
    window.close()
  }, [requestId])

  const { useCustomEthereumNetworks: allowAddNetwork } = useSettings()

  // might want to raise an error if no network
  if (!network) return null

  return (
    <>
      <Container>
        <Header
          text={<AppPill url={siteUrl} />}
          nav={
            <IconButton onClick={cancel}>
              <XIcon />
            </IconButton>
          }
        />
        <Content>
          <div>
            <GlobeIcon className="globeIcon" />
          </div>
          <h1>Add new token</h1>
          <p>
            You are adding the token <strong>{assetRequest?.options.symbol}</strong> to{" "}
            <strong>{network.name}</strong>
          </p>
          <div className="grow"></div>
          <div>
            {/* TODO */}
            {/* <NetworksDetailsButton network={network} /> */}
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
      {/* {!allowAddNetwork && <NetworkAddNotSupported onClose={cancel} />} */}
    </>
  )
}
