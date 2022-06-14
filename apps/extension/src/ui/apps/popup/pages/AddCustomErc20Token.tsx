import { AppPill } from "@talisman/components/AppPill"
import StyledGrid from "@talisman/components/Grid"
import { IconButton } from "@talisman/components/IconButton"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { XIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEthWatchAssetRequests } from "@ui/hooks/useEthWatchAssetRequests"
import { useCallback, useMemo, useState } from "react"
import styled from "styled-components"
import Layout, { Content, Header, Footer } from "../Layout"
import unknownToken from "@talisman/theme/icons/custom-token-generic.svg"
import { CustomErc20TokenViewDetails } from "@ui/domains/Erc20Tokens/CustomErc20TokenViewDetails"

const TokenLogo = styled.img`
  width: 5.4rem;
  height: 5.4rem;
`
const TokenLogoSmall = styled.img`
  width: 1.6rem;
  height: 1.6rem;
`

const Container = styled(Layout)`
  .layout-content .children {
    color: var(--color-mid);
    text-align: center;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: 3.2rem;

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
      padding: 0 1.2rem;
      border-radius: 4.8rem;
      font-weight: var(--font-weight-normal);
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      line-height: 1.6em;
      vertical-align: middle;
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

const ErrorMessage = styled.p`
  color: var(--color-status-error);
`

export const AddCustomErc20Token = () => {
  const [error, setError] = useState<string>()
  const requests = useEthWatchAssetRequests()

  const { requestId, siteUrl, token } = useMemo(() => {
    if (!requests.length) return {}
    const current = requests[0]
    return {
      requestId: current.id,
      siteUrl: current.url,
      assetRequest: current.request,
      token: current.token,
    }
  }, [requests])

  const network = useEvmNetwork(token?.evmNetwork?.id)

  const approve = useCallback(async () => {
    setError(undefined)
    try {
      await api.ethWatchAssetRequestApprove(requestId!)
      window.close()
    } catch (err) {
      setError((err as Error).message)
    }
  }, [requestId])

  const cancel = useCallback(async () => {
    setError(undefined)
    try {
      await api.ethWatchAssetRequestCancel(requestId!)
      window.close()
    } catch (err) {
      setError((err as Error).message)
    }
  }, [requestId])

  if (!token || !network) return null

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
            <TokenLogo src={token?.image ?? unknownToken} alt={token?.symbol} />
          </div>
          <h1>New Token</h1>
          <p>
            You are adding the token
            <br />
            <strong>
              <TokenLogoSmall src={token?.image ?? unknownToken} alt="" />
              {token.symbol}
            </strong>{" "}
            on{" "}
            <strong>
              {"iconUrls" in network
                ? network.iconUrls.length && <TokenLogoSmall src={network.iconUrls[0]} alt="" />
                : null}
              {network.name}
            </strong>
          </p>
          <div className="grow"></div>
          <div>
            <CustomErc20TokenViewDetails token={token} network={network} />
          </div>
        </Content>
        <Footer>
          <ErrorMessage>{error}</ErrorMessage>
          <StyledGrid>
            <SimpleButton onClick={cancel}>Reject</SimpleButton>
            <SimpleButton primary onClick={approve}>
              Approve
            </SimpleButton>
          </StyledGrid>
        </Footer>
      </Container>
    </>
  )
}
