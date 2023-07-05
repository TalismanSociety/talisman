import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { EthPriorityOptionName } from "@core/domains/signing/types"
import { AppPill } from "@talisman/components/AppPill"
import { WithTooltip } from "@talisman/components/Tooltip"
import { InfoIcon } from "@talisman/theme/icons"
import { useQuery } from "@tanstack/react-query"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { useEthereumProvider } from "@ui/domains/Ethereum/useEthereumProvider"
import { EthSignBody } from "@ui/domains/Sign/Ethereum/EthSignBody"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import useToken from "@ui/hooks/useToken"
import { Suspense, lazy, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../../Layout/PopupLayout"
import { SignAccountAvatar } from "./SignAccountAvatar"

const LedgerEthereum = lazy(() => import("@ui/domains/Sign/LedgerEthereum"))

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
    <PopupLayout>
      <PopupHeader right={<SignAccountAvatar account={account} />}>
        <AppPill url={url} />
      </PopupHeader>
      <PopupContent>
        <div className="scrollable scrollable-800 text-body-secondary h-full overflow-y-auto text-center">
          <EthSignBody transactionInfo={transactionInfo} isReady={!isLoading} />
        </div>
      </PopupContent>
      {!isLoading && (
        <PopupFooter>
          <div className="flex flex-col gap-4">
            <div id="sign-alerts-inject"></div>
            {errorMessage && (
              <SignAlertMessage className="mb-8" type="error">
                <WithTooltip tooltip={errorDetails}>{errorMessage}</WithTooltip>
              </SignAlertMessage>
            )}
          </div>
          <Suspense fallback={null}>
            {transaction && txDetails && network?.nativeToken ? (
              <div className="text-body-secondary my-8 flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    {t("Estimated Fee")}{" "}
                    <Tooltip placement="top">
                      <TooltipTrigger asChild>
                        <InfoIcon className="inline align-text-top" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <FeeTooltip
                          account={account?.address}
                          tokenId={network.nativeToken.id}
                          estimatedFee={txDetails.estimatedFee.toString()}
                          maxFee={txDetails.maxFee.toString()}
                        />
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div>{transaction?.type === 2 && t("Priority")}</div>
                </div>
                <div className="flex items-center justify-between">
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
                      drawerContainerId="main"
                    />
                  </div>
                </div>
              </div>
            ) : null}
            {account && request && account.isHardware ? (
              transaction ? (
                <LedgerEthereum
                  manualSend
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
              <div className="grid w-full grid-cols-2 gap-12">
                <Button disabled={processing} onClick={reject}>
                  {t("Cancel")}
                </Button>
                <Button
                  disabled={!transaction || processing || isLoading || !isValid}
                  processing={processing}
                  primary
                  onClick={approve}
                >
                  {t("Approve")}
                </Button>
              </div>
            )}
          </Suspense>
        </PopupFooter>
      )}
    </PopupLayout>
  )
}
