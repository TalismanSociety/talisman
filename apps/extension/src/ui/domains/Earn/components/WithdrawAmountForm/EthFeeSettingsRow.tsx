import { isTokenEth } from "@talismn/chaindata-provider"
import { useTranslation } from "react-i18next"

import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { IS_POPUP } from "@ui/util/constants"

import { useWithdrawFundsContext } from "../WithdrawFundsProvider"

export const EthFeeSettingsRow = () => {
  const { t } = useTranslation()
  const { token, network, transaction } = useWithdrawFundsContext()

  if (
    !token ||
    !network ||
    network.platform !== "ethereum" ||
    !isTokenEth(token) ||
    !transaction ||
    transaction.platform !== "ethereum"
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
      <div className="text-grey-400">{t("Transaction Priority")}</div>
      <div>
        {network.nativeTokenId && priority && tx && txDetails && (
          <EthFeeSelect
            tokenId={network.nativeTokenId}
            drawerContainerId={IS_POPUP ? "main" : "withdraw-modal-content"}
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
