import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { EthPriorityOptionName } from "@core/domains/signing/types"
import { AppPill } from "@talisman/components/AppPill"
import Grid from "@talisman/components/Grid"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { WithTooltip } from "@talisman/components/Tooltip"
import { InfoIcon } from "@talisman/theme/icons"
import { useQuery } from "@tanstack/react-query"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { useEthereumProvider } from "@ui/domains/Ethereum/useEthereumProvider"
import { EthSignBody } from "@ui/domains/Sign/Ethereum/EthSignBody"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import useToken from "@ui/hooks/useToken"
import { Suspense, lazy, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import styled from "styled-components"
import { Button } from "talisman-ui"

import { Container } from "./common"
import { SignAccountAvatar } from "./SignAccountAvatar"

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

const useEvmBalance = (address?: string, evmNetworkId?: string) => {
  const { t } = useTranslation("request")
  const provider = useEthereumProvider(evmNetworkId)
  return useQuery({
    queryKey: ["evm-balance", provider?.network?.chainId, address],
    queryFn: async () => {
      try {
        if (!provider || !address) return null
        const balance = await provider.getBalance(address)
        return balance.toString()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
        throw new Error(t("Failed to fetch balance"))
      }
    },
  })
}

const FeeTooltip = ({
  estimatedFee,
  account,
  maxFee,
  tokenId,
}: {
  account?: string
  estimatedFee?: string | bigint
  maxFee?: string | bigint
  tokenId?: string
}) => {
  const { t } = useTranslation("request")
  // cannot use useBalance because our db may not include testnet balances
  const token = useToken(tokenId)
  const { data: balance, error } = useEvmBalance(account, token?.evmNetwork?.id)

  if (!estimatedFee && !maxFee) return null

  return (
    <div className="flex flex-col gap-2 whitespace-nowrap text-sm">
      <>
        {!!estimatedFee && (
          <div className="flex w-full justify-between gap-8">
            <div>{t("Estimated Fee:")}</div>
            <div>
              <TokensAndFiat tokenId={tokenId} planck={estimatedFee} noTooltip noCountUp />
            </div>
          </div>
        )}
        {!!maxFee && (
          <div className="flex w-full justify-between gap-8">
            <div>{t("Max Fee:")}</div>
            <div>
              <TokensAndFiat tokenId={tokenId} planck={maxFee} noTooltip noCountUp />
            </div>
          </div>
        )}
        {(balance || error) && (
          <div className="flex w-full justify-between gap-8">
            <div>{t("Balance:")}</div>
            {balance ? (
              <div>
                <TokensAndFiat tokenId={tokenId} planck={balance} noTooltip noCountUp isBalance />
              </div>
            ) : (
              <div className="text-alert-warn">Failed to fetch balance</div>
            )}
          </div>
        )}
      </>
    </div>
  )
}

export const EthSignTransactionRequest = () => {
  const { t } = useTranslation("request")
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
    errorDetails,
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
    networkUsage,
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

  // gas settings must be locked as soon as payload is sent to ledger
  const handleSendToLedger = useCallback(() => {
    setIsPayloadLocked(true)
  }, [setIsPayloadLocked])

  const handleFeeChange = useCallback(
    (priority: EthPriorityOptionName) => {
      setPriority(priority)
      setReady() // clear error from previous submit attempt
    },
    [setPriority, setReady]
  )

  return (
    <SignContainer>
      <Header text={<AppPill url={url} />} nav={<SignAccountAvatar account={account} />}></Header>
      <Content>
        <div className="scrollable scrollable-800 h-full overflow-y-auto">
          <EthSignBody transactionInfo={transactionInfo} isReady={!isLoading} />
        </div>
      </Content>
      {!isLoading && (
        <Footer>
          <div className="space-y-4">
            <div id="sign-alerts-inject"></div>
            {errorMessage && (
              <SignAlertMessage type="error">
                <WithTooltip tooltip={errorDetails}>{errorMessage}</WithTooltip>
              </SignAlertMessage>
            )}
          </div>
          <Suspense fallback={null}>
            {transaction && txDetails && network?.nativeToken ? (
              <div className="gasInfo mt-8">
                <div>
                  <div>
                    {t("Estimated Fee")}{" "}
                    <WithTooltip
                      tooltip={
                        <FeeTooltip
                          account={account?.address}
                          tokenId={network.nativeToken.id}
                          estimatedFee={txDetails.estimatedFee.toString()}
                          maxFee={txDetails.maxFee.toString()}
                        />
                      }
                    >
                      <InfoIcon className="inline align-text-top" />
                    </WithTooltip>
                  </div>
                  <div>{transaction?.type === 2 && t("Priority")}</div>
                </div>
                <div>
                  <div>
                    <TokensAndFiat
                      tokenId={network.nativeToken.id}
                      planck={txDetails.estimatedFee.toString()}
                    />
                  </div>
                  <div>
                    <EthFeeSelect
                      tx={request}
                      tokenId={network.nativeToken.id}
                      disabled={isPayloadLocked}
                      gasSettingsByPriority={gasSettingsByPriority}
                      setCustomSettings={setCustomSettings}
                      txDetails={txDetails}
                      priority={priority}
                      onChange={handleFeeChange}
                      networkUsage={networkUsage}
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
                  {t("Cancel")}
                </Button>
              )
            ) : (
              <Grid>
                <SimpleButton disabled={processing} onClick={reject}>
                  {t("Cancel")}
                </SimpleButton>
                <SimpleButton
                  disabled={!transaction || processing || isLoading || !isValid}
                  processing={processing}
                  primary
                  onClick={approve}
                >
                  {t("Approve")}
                </SimpleButton>
              </Grid>
            )}
          </Suspense>
        </Footer>
      )}
    </SignContainer>
  )
}
