import { LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"

import { isEvmToken } from "@ui/util/isEvmToken"

import { ChainLogo } from "../../Asset/ChainLogo"
import { TokensAndFiat } from "../../Asset/TokensAndFiat"
import { EthFeeSelect } from "../../Ethereum/GasSettings/EthFeeSelect"
import { SendFundsFeeTooltip } from "../SendFundsFeeTooltip"
import { useNetworkDetails } from "../useNetworkDetails"
import { useSendFunds } from "../useSendFunds"
import { Container } from "./Container"

const NetworkRow = () => {
  const [t] = useTranslation()

  const { networkId, networkName } = useNetworkDetails()

  return (
    <div className="flex w-full items-center justify-between">
      <div>{t("Network")}</div>
      <div className="flex items-center gap-2">
        <ChainLogo id={networkId} className="inline-block text-base" />
        <div>{networkName}</div>
      </div>
    </div>
  )
}

const EvmFeeSettingsRow = () => {
  const { t } = useTranslation("send-funds")
  const { token, evmNetwork, evmTransaction } = useSendFunds()

  if (!token || !evmTransaction || !evmNetwork || !isEvmToken(token)) return null

  const {
    tx,
    txDetails,
    priority,
    gasSettingsByPriority,
    setCustomSettings,
    setPriority,
    networkUsage,
  } = evmTransaction

  return (
    <div className="flex h-12 w-full items-center justify-between gap-4">
      <div>{t("Transaction Priority")}</div>
      <div>
        {evmNetwork?.nativeToken?.id && priority && tx && txDetails && (
          <EthFeeSelect
            tokenId={evmNetwork.nativeToken.id}
            drawerContainerId="main"
            gasSettingsByPriority={gasSettingsByPriority}
            setCustomSettings={setCustomSettings}
            onChange={setPriority}
            priority={priority}
            txDetails={txDetails}
            networkUsage={networkUsage}
            tx={tx}
          />
        )}
      </div>
    </div>
  )
}

export const FeesSummary = () => {
  const { t } = useTranslation("send-funds")
  const { feeToken, estimatedFee, isLoading } = useSendFunds()

  return (
    <Container
      className={classNames("space-y-4 px-8 py-4", isLoading && !estimatedFee && "animate-pulse")}
    >
      <NetworkRow />
      <EvmFeeSettingsRow />
      <div className="flex w-full items-center justify-between gap-4 ">
        <div className="whitespace-nowrap">
          {t("Estimated Fee")} <SendFundsFeeTooltip />
        </div>
        <div
          className={classNames(
            "flex grow items-center justify-end gap-2 truncate",
            isLoading && estimatedFee && "animate-pulse"
          )}
        >
          {isLoading && !estimatedFee && (
            <div className="text-body-disabled flex items-center gap-2">
              <span>{t("Validating Transaction")}</span>
              <LoaderIcon className="animate-spin-slow" />
            </div>
          )}
          {estimatedFee && feeToken && (
            <TokensAndFiat planck={estimatedFee.planck} tokenId={feeToken.id} />
          )}
        </div>
      </div>
    </Container>
  )
}
