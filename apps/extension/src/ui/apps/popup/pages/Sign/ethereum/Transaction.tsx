import { EthPriorityOptionName } from "@core/domains/signing/types"
import { AppPill } from "@talisman/components/AppPill"
import { WithTooltip } from "@talisman/components/Tooltip"
import { InfoIcon } from "@talismn/icons"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { useEthBalance } from "@ui/domains/Ethereum/useEthBalance"
import { useEthereumProvider } from "@ui/domains/Ethereum/useEthereumProvider"
import { EthSignBody } from "@ui/domains/Sign/Ethereum/EthSignBody"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { SignHardwareEthereum } from "@ui/domains/Sign/SignHardwareEthereum"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { Suspense, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { SignAccountAvatar } from "../SignAccountAvatar"

const useEvmBalance = (address: string, evmNetworkId: string | undefined) => {
  const provider = useEthereumProvider(evmNetworkId)
  return useEthBalance(provider, address)
}

const FeeTooltip = ({
  estimatedFee,
  maxFee,
  tokenId,
  balance,
}: {
  estimatedFee: string | bigint | undefined
  maxFee: string | bigint | undefined
  tokenId: string | undefined
  balance: string | bigint | null | undefined
}) => {
  const { t } = useTranslation("request")

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
        {balance !== undefined && (
          <div className="flex w-full justify-between gap-8">
            <div>{t("Balance:")}</div>
            <div>
              <TokensAndFiat
                tokenId={tokenId}
                planck={balance ?? 0n}
                noTooltip
                noCountUp
                isBalance
              />
            </div>
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
  const { balance } = useEvmBalance(account?.address, network?.id)

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
        <PopupFooter className="flex flex-col gap-8">
          <div id="sign-alerts-inject" className="flex flex-col gap-4">
            {errorMessage && (
              <SignAlertMessage type="error">
                <WithTooltip tooltip={errorDetails}>{errorMessage}</WithTooltip>
              </SignAlertMessage>
            )}
          </div>
          <Suspense fallback={null}>
            {transaction && txDetails && network?.nativeToken ? (
              <div className="text-body-secondary flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    {t("Estimated Fee")}{" "}
                    <Tooltip placement="top">
                      <TooltipTrigger asChild>
                        <span>
                          <InfoIcon className="inline align-text-top" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <FeeTooltip
                          tokenId={network.nativeToken.id}
                          estimatedFee={txDetails.estimatedFee.toString()}
                          maxFee={txDetails.maxFee.toString()}
                          balance={balance?.toString()}
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
              <SignHardwareEthereum
                method="eth_sendTransaction"
                payload={transaction}
                account={account}
                onSigned={approveHardware}
                onSentToDevice={setIsPayloadLocked}
                onCancel={reject}
                containerId="main"
              />
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
