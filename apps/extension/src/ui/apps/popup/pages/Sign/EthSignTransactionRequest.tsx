import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { BalanceFormatter } from "@core/domains/balances"
import { AppPill } from "@talisman/components/AppPill"
import Grid from "@talisman/components/Grid"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { EthFeeSelect } from "@ui/domains/Ethereum/EthFeeSelect"
import { EthSignBody } from "@ui/domains/Ethereum/Sign/EthSignBody"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import useToken from "@ui/hooks/useToken"
import { BigNumber } from "ethers"
import { lazy, Suspense, useCallback, useEffect, useMemo } from "react"
import styled from "styled-components"
import { Button } from "talisman-ui"

import { Container } from "./common"

const LedgerEthereum = lazy(() => import("@ui/domains/Sign/LedgerEthereum"))

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
    gap: 0.4rem;
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
    approveHardware,
    isPayloadLocked,
    setIsPayloadLocked,
    transactionInfo,
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

  // gas settings must be locked as soon as payload is sent to ledger
  const handleSendToLedger = useCallback(() => {
    setIsPayloadLocked(true)
  }, [setIsPayloadLocked])

  const estimatedFee = useMemo(
    () =>
      txDetails && nativeToken
        ? new BalanceFormatter(
            BigNumber.from(txDetails?.estimatedFee).toString(),
            nativeToken?.decimals,
            nativeToken?.rates
          )
        : null,
    [nativeToken, txDetails]
  )

  return (
    <SignContainer>
      <Header text={<AppPill url={url} />}></Header>
      <Content>
        <EthSignBody
          account={account}
          network={network}
          request={request}
          transactionInfo={transactionInfo}
        />
      </Content>
      <Footer>
        <Suspense fallback={null}>
          {nativeToken && transaction && txDetails && estimatedFee ? (
            <>
              <div className="gasInfo">
                <div>
                  <div>Estimated Fee</div>
                  <div>{transaction?.type === 2 && "Priority"}</div>
                </div>
                <div>
                  <div>
                    <Tokens
                      amount={estimatedFee.tokens}
                      decimals={nativeToken.decimals}
                      symbol={nativeToken.symbol}
                      noCountUp
                    />
                    {estimatedFee && nativeToken?.rates ? (
                      <>
                        {" "}
                        (~
                        <Fiat amount={estimatedFee.fiat("usd")} noCountUp currency="usd" />)
                      </>
                    ) : null}
                  </div>
                  <div>
                    <EthFeeSelect
                      disabled={isPayloadLocked}
                      transaction={transaction}
                      txDetails={txDetails}
                      priority={priority}
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
          {account && request && account.isHardware ? (
            transaction ? (
              <LedgerEthereum
                manualSend
                className="mt-6"
                method="transaction"
                payload={transaction}
                account={account as AccountJsonHardwareEthereum}
                onSignature={approveHardware}
                onReject={reject}
                onSendToLedger={handleSendToLedger}
              />
            ) : (
              <Button className="w-full" onClick={reject}>
                Cancel
              </Button>
            )
          ) : (
            <Grid>
              <SimpleButton disabled={processing} onClick={reject}>
                Cancel
              </SimpleButton>
              <SimpleButton
                disabled={!transaction || processing || isLoading}
                processing={processing}
                primary
                onClick={approve}
              >
                Approve
              </SimpleButton>
            </Grid>
          )}
        </Suspense>
      </Footer>
    </SignContainer>
  )
}
