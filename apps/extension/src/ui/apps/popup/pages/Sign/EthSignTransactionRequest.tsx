import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { EthPriorityOptionName } from "@core/domains/signing/types"
import { AppPill } from "@talisman/components/AppPill"
import Grid from "@talisman/components/Grid"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { WithTooltip } from "@talisman/components/Tooltip"
import { InfoIcon } from "@talisman/theme/icons"
import { EvmNativeToken } from "@talismn/balances-evm-native"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { EthSignBody } from "@ui/domains/Ethereum/Sign/EthSignBody"
import { SignAlertMessage } from "@ui/domains/Ethereum/Sign/shared"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { useBalance } from "@ui/hooks/useBalance"
import useToken from "@ui/hooks/useToken"
import { Suspense, lazy, useCallback, useEffect, useMemo } from "react"
import styled from "styled-components"
import { Button } from "talisman-ui"

import { Container } from "./common"

const LedgerEthereum = lazy(() => import("@ui/domains/Sign/LedgerEthereum"))

const SignContainer = styled(Container)`
  .layout-content .children {
    padding-left: 0;
    padding-right: 0;

    .scrollable {
      // padding-right is dynamic and browser-specific so only set padding left and width
      padding-left: 2.4rem;
      & > div {
        width: 35.2rem;
        max-width: 35.2rem;
      }
    }
  }

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

const FeeTooltip = ({
  account,
  estimatedFee,
  maxFee,
  tokenId,
}: {
  account?: string
  estimatedFee?: string | bigint
  maxFee?: string | bigint
  tokenId?: string
}) => {
  const balance = useBalance(account as string, tokenId as string)

  if (!estimatedFee && !maxFee && !balance) return null
  return (
    <div className="flex flex-col gap-2 whitespace-nowrap text-sm">
      {!!estimatedFee && (
        <div className="flex w-full justify-between gap-8">
          <div>Estimated Fee:</div>
          <div>
            <TokensAndFiat tokenId={tokenId} planck={estimatedFee} noTooltip noCountUp />
          </div>
        </div>
      )}
      {!!maxFee && (
        <div className="flex w-full justify-between gap-8">
          <div>Max Fee:</div>
          <div>
            <TokensAndFiat tokenId={tokenId} planck={maxFee} noTooltip noCountUp />
          </div>
        </div>
      )}
      {!!balance && (
        <div className="flex w-full justify-between gap-8">
          <div>Balance:</div>
          <div>
            <TokensAndFiat
              tokenId={tokenId}
              planck={balance.free.planck}
              noTooltip
              noCountUp
              isBalance
            />
          </div>
        </div>
      )}
    </div>
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
    approveHardware,
    isPayloadLocked,
    setIsPayloadLocked,
    transactionInfo,
    gasSettingsByPriority,
    setCustomSettings,
    setReady,
    isValid,
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

  const isReadyToDisplay = useMemo(
    () => Boolean(transactionInfo && (txDetails?.estimatedFee || errorMessage)),
    [transactionInfo, txDetails?.estimatedFee, errorMessage]
  )

  const handleFeeChange = useCallback(
    (priority: EthPriorityOptionName) => {
      setPriority(priority)
      setReady() // clear error from previous submit attempt
    },
    [setPriority, setReady]
  )

  return (
    <SignContainer>
      <Header text={<AppPill url={url} />}></Header>
      <Content>
        <div className="scrollable scrollable-800 h-full overflow-y-auto">
          <EthSignBody transactionInfo={transactionInfo} isReady={isReadyToDisplay} />
        </div>
      </Content>
      <Footer>
        <div className="space-y-4">
          <div id="sign-alerts-inject"></div>
          {isReadyToDisplay && errorMessage && (
            <SignAlertMessage type="error">{errorMessage}</SignAlertMessage>
          )}
        </div>
        {isReadyToDisplay && (
          <Suspense fallback={null}>
            {nativeToken && transaction && txDetails?.estimatedFee ? (
              <div className="gasInfo mt-8">
                <div>
                  <div>
                    Estimated Fee{" "}
                    <WithTooltip
                      tooltip={
                        <FeeTooltip
                          account={account?.address}
                          tokenId={network?.nativeToken?.id}
                          estimatedFee={txDetails.estimatedFee.toString()}
                          maxFee={txDetails.maxFee.toString()}
                        />
                      }
                    >
                      <InfoIcon className="inline align-text-top" />
                    </WithTooltip>
                  </div>
                  <div>{transaction?.type === 2 && "Priority"}</div>
                </div>
                <div>
                  <div>
                    <TokensAndFiat
                      tokenId={network?.nativeToken?.id}
                      planck={txDetails?.estimatedFee?.toString()}
                    />
                  </div>
                  <div>
                    <EthFeeSelect
                      tx={request}
                      nativeToken={nativeToken as EvmNativeToken}
                      disabled={isPayloadLocked}
                      gasSettingsByPriority={gasSettingsByPriority}
                      setCustomSettings={setCustomSettings}
                      txDetails={txDetails}
                      priority={priority}
                      onChange={handleFeeChange}
                      decimals={nativeToken?.decimals}
                      symbol={nativeToken?.symbol}
                    />
                  </div>
                </div>
              </div>
            ) : null}
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
                  disabled={!transaction || processing || isLoading || !isValid}
                  processing={processing}
                  primary
                  onClick={approve}
                >
                  Approve
                </SimpleButton>
              </Grid>
            )}
          </Suspense>
        )}
      </Footer>
    </SignContainer>
  )
}
