import { EthNetworkId } from "@talismn/chaindata-provider"
import { InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { EthPriorityOptionName, EvmAddress } from "extension-core"
import { useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AppPill } from "@talisman/components/AppPill"
import { WithTooltip } from "@talisman/components/Tooltip"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { FeeTooltip } from "@ui/domains/Ethereum/FeeTooltip"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { useEthBalance } from "@ui/domains/Ethereum/useEthBalance"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { EthSignBody } from "@ui/domains/Sign/Ethereum/EthSignBody"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { SignApproveButton } from "@ui/domains/Sign/SignApproveButton"
import { SignHardwareEthereum } from "@ui/domains/Sign/SignHardwareEthereum"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { SignViewBodyShimmer } from "@ui/domains/Sign/Views/SignViewBodyShimmer"

import { SignNetworkLogo } from "../SignNetworkLogo"

const useEvmBalance = (address: EvmAddress, evmNetworkId: EthNetworkId | undefined) => {
  const publicClient = usePublicClient(evmNetworkId)
  return useEthBalance(publicClient, address)
}

export const EthSignTransactionRequest = () => {
  const { t } = useTranslation()
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
    decodedTx,
    gasSettingsByPriority,
    setCustomSettings,
    setReady,
    isValid,
    networkUsage,
    riskAnalysis,
  } = useEthSignTransactionRequest()
  const { balance } = useEvmBalance(account?.address as EvmAddress, network?.id)

  const { processing, errorMessage } = useMemo(() => {
    return {
      processing: status === "PROCESSING",
      errorMessage: status === "ERROR" ? message : (error ?? ""),
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
    [setPriority, setReady],
  )

  return (
    <PopupLayout>
      <PopupHeader
        className={classNames(isLoading && "invisible")}
        right={<SignNetworkLogo network={network} />}
      >
        <AppPill url={url} />
      </PopupHeader>
      {isLoading ? (
        <SignViewBodyShimmer />
      ) : (
        <RiskAnalysisProvider riskAnalysis={riskAnalysis} onReject={reject}>
          <PopupContent>
            <div className="scrollable scrollable-800 text-body-secondary h-full overflow-y-auto text-center">
              <EthSignBody decodedTx={decodedTx} isReady={!isLoading} />
            </div>
          </PopupContent>
          <PopupFooter className="flex flex-col gap-8">
            <div id="sign-alerts-inject" className="flex flex-col gap-4">
              {errorMessage && (
                <SignAlertMessage type="error">
                  <WithTooltip tooltip={errorDetails}>{errorMessage}</WithTooltip>
                </SignAlertMessage>
              )}
            </div>

            <div className="text-body-secondary flex min-h-[4.48rem] flex-col gap-2 text-sm">
              {transaction && txDetails && !!network && (
                <>
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
                            tokenId={network.nativeTokenId}
                            estimatedFee={txDetails.estimatedFee}
                            maxFee={txDetails.maxFee}
                            balance={balance}
                          />
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div>{transaction?.type === "eip1559" && t("Priority")}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <TokensAndFiat
                        tokenId={network.nativeTokenId}
                        planck={txDetails.estimatedFee.toString()}
                      />
                    </div>
                    <div>
                      <EthFeeSelect
                        tx={transaction}
                        tokenId={network.nativeTokenId}
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
                </>
              )}
            </div>
            {account && request && account.type === "ledger-ethereum" ? (
              <SignHardwareEthereum
                evmNetworkId={network?.id}
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
                <SignApproveButton
                  disabled={!transaction || isLoading || !isValid}
                  processing={processing}
                  primary
                  onClick={approve}
                >
                  {t("Approve")}
                </SignApproveButton>
              </div>
            )}
          </PopupFooter>
        </RiskAnalysisProvider>
      )}
    </PopupLayout>
  )
}
