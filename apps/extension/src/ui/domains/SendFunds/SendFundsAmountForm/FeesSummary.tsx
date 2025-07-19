import { isTokenEth } from "@talismn/chaindata-provider"
import { LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"

import { TokensAndFiat } from "../../Asset/TokensAndFiat"
import { EthFeeSelect } from "../../Ethereum/GasSettings/EthFeeSelect"
import { NetworkLogo } from "../../Networks/NetworkLogo"
import { SendFundsFeeTooltip } from "../SendFundsFeeTooltip"
import { useSendFunds } from "../useSendFunds"
import { Container } from "./Container"

const NetworkRow = () => {
  const [t] = useTranslation()

  const { network } = useSendFunds()

  return (
    <div className="flex w-full items-center justify-between">
      <div>{t("Network")}</div>
      <div className="flex items-center gap-2">
        <NetworkLogo networkId={network?.id} className="inline-block text-base" />
        <div>{network?.name}</div>
      </div>
    </div>
  )
}

const EvmFeeSettingsRow = () => {
  const { t } = useTranslation()
  const { token, network, transaction } = useSendFunds()

  if (
    !token ||
    transaction?.platform !== "ethereum" ||
    network?.platform !== "ethereum" ||
    !isTokenEth(token)
  )
    return null

  const {
    tx,
    txDetails,
    priority,
    gasSettingsByPriority,
    setCustomSettings,
    setPriority,
    networkUsage,
  } = transaction

  return (
    <div className="flex h-12 w-full items-center justify-between gap-4">
      <div>{t("Transaction Priority")}</div>
      <div>
        {network.nativeTokenId && priority && tx && txDetails && (
          <EthFeeSelect
            tokenId={network.nativeTokenId}
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
  const { t } = useTranslation()
  const { feeToken, estimatedFee, isLoading } = useSendFunds()

  return (
    <Container
      className={classNames("space-y-4 px-8 py-4", isLoading && !estimatedFee && "animate-pulse")}
    >
      <NetworkRow />
      <EvmFeeSettingsRow />
      <div className="flex w-full items-center justify-between gap-4">
        <div className="whitespace-nowrap">
          {t("Estimated Fee")} <SendFundsFeeTooltip />
        </div>
        <div
          className={classNames(
            "flex grow items-center justify-end gap-2 truncate",
            isLoading && estimatedFee && "animate-pulse",
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
