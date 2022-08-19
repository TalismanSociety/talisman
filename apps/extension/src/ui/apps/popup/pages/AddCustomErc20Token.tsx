import { AppPill } from "@talisman/components/AppPill"
import StyledGrid from "@talisman/components/Grid"
import { IconButton } from "@talisman/components/IconButton"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { XIcon } from "@talisman/theme/icons"
import unknownToken from "@talisman/theme/icons/custom-token-generic.svg"
import { api } from "@ui/api"
import { CustomErc20TokenViewDetails } from "@ui/domains/Erc20Tokens/CustomErc20TokenViewDetails"
import { useEthWatchAssetRequestById } from "@ui/hooks/useEthWatchAssetRequestById"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useCallback, useState } from "react"
import { useParams } from "react-router-dom"
import styled from "styled-components"

import Layout, { Content, Footer, Header } from "../Layout"

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
  const { id } = useParams() as { id: string }
  const request = useEthWatchAssetRequestById(id)

  const network = useEvmNetwork(request?.token?.evmNetwork?.id)

  const approve = useCallback(async () => {
    setError(undefined)
    try {
      await api.ethWatchAssetRequestApprove(id)
      window.close()
    } catch (err) {
      setError((err as Error).message)
    }
  }, [id])

  const cancel = useCallback(async () => {
    setError(undefined)
    try {
      await api.ethWatchAssetRequestCancel(id)
    } catch (err) {
      // ignore
    }
    window.close()
  }, [id])

  if (!request || !request.token || !network) return null

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
          <TokenLogo src={request.token.image ?? unknownToken} alt={request.token.symbol} />
        </div>
        <h1>New Token</h1>
        <p>
          You are adding the token
          <br />
          <strong>
            <TokenLogoSmall src={request.token.image ?? unknownToken} alt="" />
            {request.token.symbol}
          </strong>{" "}
          on{" "}
          <strong>
            {"iconUrls" in network
              ? !!network.iconUrls.length && <TokenLogoSmall src={network.iconUrls[0]} alt="" />
              : null}
            {network.name}
          </strong>
        </p>
        <div className="grow"></div>
        <div>
          <CustomErc20TokenViewDetails token={request.token} network={network} />
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
  )
}
