import { useMemo } from "react"
import Grid from "@talisman/components/Grid"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { Header, Content, Footer } from "@ui/apps/popup/Layout"
import { EthSignRequestProvider, useEthSignRequest } from "@ui/domains/Sign/SignRequestContext"
import { Container } from "./common"
import { useParams } from "react-router-dom"
import { AccountJsonAny, EthereumNetwork } from "@core/types"
import { BigNumberish } from "ethers"
import styled from "styled-components"
import { formatEther } from "ethers/lib/utils"
import { formatDecimals } from "talisman-utils"
import { AppPill } from "@talisman/components/AppPill"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { EthFeeSelect } from "@ui/domains/Sign/EthFeeSelect"
import { formatEtherValue } from "@talisman/util/formatEthValue"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"

const Message = styled.textarea`
  background: var(--color-background-muted-3x);
  flex-grow: 1;
  text-align: left;
  margin: 0;
  padding: 1.2rem;
  border: 0;

  scrollbar-width: 3rem;
  border-radius: var(--border-radius-small);
  margin-top: 0.8rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
`

const SignContainer = styled(Container)`
  .layout-content .children h2 {
    text-align: center;
    padding: 0;
  }

  .layout-content .children h1.no-margin-top {
    margin: 0 0 1.6rem 0;
  }

  .sign-summary {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  strong {
    color: var(--color-foreground);
    background: var(--color-background-muted);
    border-radius: 4.8rem;
    padding: 0.4rem 0.8rem;
    white-space: nowrap;
  }

  ${SimpleButton} {
    width: auto;
  }

  .center {
    text-align: center;
  }

  .gasInfo {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    font-size: 1.4rem;
    text-align: left;
    justify-content: space-between;
    color: var(--color-mid);

    > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }

  ${Grid} {
    margin-top: 1.6rem;
  }

  .error {
    color: var(--color-status-error);
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const SignMessage = ({ account, request }: { account: AccountJsonAny; request: string }) => {
  return (
    <>
      <h1 className="no-margin-top">Sign Request</h1>
      <h2>
        You are signing a message with
        <br />
        <AccountPill account={account} />
      </h2>
      <Message readOnly defaultValue={request} />
    </>
  )
}

const SignTxWithValue = ({
  account,
  network,
  value,
}: {
  account: AccountJsonAny
  network?: EthereumNetwork
  value: BigNumberish
}) => {
  // TODO pull account balance from network (not chain) and check for sufficient balance ?

  return (
    <>
      <h1>Transfer Request</h1>
      <h2>
        You are transferring{" "}
        <strong>
          {formatDecimals(formatEther(value))} {network?.nativeToken?.symbol}
        </strong>
        <br />
        from <AccountPill account={account} />
        {network ? ` on ${network.name}` : null}
      </h2>
    </>
  )
}

const SignTxWithoutValue = ({
  account,
  network,
}: {
  account: AccountJsonAny
  network: EthereumNetwork
}) => {
  return (
    <>
      <h1>Approve Request</h1>
      <h2>
        You are approving a request with <AccountPill account={account} />
        {network ? ` on ${network.name}` : null}
      </h2>
    </>
  )
}

type EthRequestType = "message" | "txWithoutValue" | "txWithValue" | "unknown"

const EthSignRequestPage = () => {
  const {
    url,
    request,
    approve,
    reject,
    status,
    message,
    account,
    gasInfo,
    priority,
    setPriority,
    blockInfoError,
    estimatedGasError,
    network,
    isAnalysing,
  } = useEthSignRequest()

  const requestType: EthRequestType = useMemo(() => {
    if (!request) return "unknown"
    if (typeof request === "string") return "message"
    if (!request?.value) return "txWithoutValue"
    return "txWithValue"
  }, [request])

  const { processing, errorMessage } = useMemo(() => {
    return {
      processing: status === "PROCESSING",
      errorMessage: status === "ERROR" ? message : blockInfoError ?? estimatedGasError ?? "",
    }
  }, [status, message, blockInfoError, estimatedGasError])

  return (
    <SignContainer>
      <Header text={<AppPill url={url} />}></Header>
      <Content>
        {account && request && network && (
          <>
            <div className="sign-summary">
              {requestType === "message" && (
                <SignMessage account={account} request={request as string} />
              )}
              {requestType === "txWithValue" && (
                <SignTxWithValue network={network} account={account} value={request.value!} />
              )}
              {requestType === "txWithoutValue" && (
                <SignTxWithoutValue network={network} account={account} />
              )}
            </div>
          </>
        )}
      </Content>
      <Footer>
        {gasInfo ? (
          <>
            <div className="center">
              <ViewDetailsEth />
            </div>
            <div className="gasInfo">
              <div>
                <div>Max Fee</div>
                <div>Priority</div>
              </div>
              <div>
                <div>
                  {formatEtherValue(gasInfo.maxFeeAndGasCost, network?.nativeToken?.symbol)}
                </div>
                <div>
                  <EthFeeSelect
                    {...gasInfo}
                    priority={priority ?? "low"}
                    onChange={setPriority}
                    symbol={network?.nativeToken?.symbol}
                  />
                </div>
              </div>
            </div>
          </>
        ) : null}
        {errorMessage && <p className="error">{errorMessage}</p>}
        {account && request && (
          <>
            <Grid>
              <SimpleButton disabled={processing} onClick={reject}>
                Cancel
              </SimpleButton>
              <SimpleButton
                disabled={processing || isAnalysing}
                processing={processing}
                primary
                onClick={approve}
              >
                Approve
              </SimpleButton>
            </Grid>
          </>
        )}
      </Footer>
    </SignContainer>
  )
}

export const EthSignRequest = () => {
  const { id } = useParams<"id">() as { id: string }

  return (
    <EthSignRequestProvider id={id}>
      <EthSignRequestPage />
    </EthSignRequestProvider>
  )
}
