import { AccountJsonAny } from "@core/domains/accounts/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { AppPill } from "@talisman/components/AppPill"
import Grid from "@talisman/components/Grid"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { formatEtherValue } from "@talisman/util/formatEthValue"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { EthFeeSelect } from "@ui/domains/Sign/EthFeeSelect"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import useToken from "@ui/hooks/useToken"
import { BigNumberish } from "ethers"
import { formatEther } from "ethers/lib/utils"
import { useEffect, useMemo } from "react"
import styled from "styled-components"
import { formatDecimals } from "talisman-utils"

import { Container } from "./common"

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

const SignTxWithValue = ({
  account,
  network,
  value,
}: {
  account: AccountJsonAny
  network?: EvmNetwork
  value: BigNumberish
}) => {
  // TODO pull account balance from network (not chain) and check for sufficient balance ?
  const nativeToken = useToken(network?.nativeToken?.id)

  return (
    <>
      <h1>Transfer Request</h1>
      <h2>
        You are transferring{" "}
        <strong>
          {formatDecimals(formatEther(value))} {nativeToken?.symbol}
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
  network: EvmNetwork
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

export const EthSignTransactionRequest = () => {
  const {
    url,
    request,
    approve,
    reject,
    status,
    message,
    account,
    txDetails,
    priority,
    setPriority,
    error,
    network,
    isLoading,
    transaction,
  } = useEthSignTransactionRequest()

  const { processing, errorMessage } = useMemo(() => {
    return {
      processing: status === "PROCESSING",
      errorMessage: status === "ERROR" ? message : error ?? "",
    }
  }, [status, message, error])

  useEffect(() => {
    // force close upon success, usefull in case this is the browser embedded popup (which doesn't close by itself)
    if (status === "SUCCESS") window.close()
  }, [status])

  const nativeToken = useToken(network?.nativeToken?.id)

  return (
    <SignContainer>
      <Header text={<AppPill url={url} />}></Header>
      <Content>
        {account && request && network && (
          <>
            <div className="sign-summary">
              {request.value ? (
                <SignTxWithValue network={network} account={account} value={request.value} />
              ) : (
                <SignTxWithoutValue network={network} account={account} />
              )}
            </div>
          </>
        )}
      </Content>
      <Footer>
        {nativeToken && transaction && txDetails ? (
          <>
            <div className="center">
              <ViewDetailsEth />
            </div>
            <div className="gasInfo">
              <div>
                <div>Estimated Fee</div>
                <div>{transaction?.type === 2 && "Priority"}</div>
              </div>
              <div>
                <div>
                  {formatEtherValue(
                    txDetails.estimatedFee,
                    nativeToken?.decimals,
                    nativeToken?.symbol
                  )}
                </div>
                <div>
                  <EthFeeSelect
                    transaction={transaction}
                    txDetails={txDetails}
                    priority={priority ?? "low"}
                    onChange={setPriority}
                    decimals={nativeToken?.decimals}
                    symbol={nativeToken?.symbol}
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
                disabled={processing || isLoading}
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
