import { InfoIcon } from "@talismn/icons"
import {
  EthGasSettings,
  EthPriorityOptionName,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "extension-core"
import { useAtomValue } from "jotai"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import { TransactionRequest } from "viem"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { FeeTooltip } from "@ui/domains/Ethereum/FeeTooltip"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { useEvmNetwork } from "@ui/state"

import { fromAssetAtom } from "../swap-modules/common.swap-module"
import { useFastBalance } from "../swaps-port/useFastBalance"

export const FeeEstimateEvm = ({
  loadableState,
  fastBalance,
  transaction,
  txDetails,
  isPayloadLocked,
  gasSettingsByPriority,
  setCustomSettings,
  priority,
  handleFeeChange,
  networkUsage,
}: {
  loadableState: "loading" | "hasError" | "hasData"
  fastBalance: ReturnType<typeof useFastBalance>
  transaction?: TransactionRequest
  txDetails?: EthTransactionDetails
  isPayloadLocked: boolean
  gasSettingsByPriority?: GasSettingsByPriority
  setCustomSettings: (gasSettings: EthGasSettings) => void
  priority?: EthPriorityOptionName
  handleFeeChange?: (priority: EthPriorityOptionName) => void
  networkUsage?: number
}) => {
  const { t } = useTranslation()

  const fromAsset = useAtomValue(fromAssetAtom)
  const fromEvmNetwork = useEvmNetwork(fromAsset?.chainId?.toString())

  if (loadableState === "hasError") return null
  return (
    <div className="text-body-secondary flex min-h-[4.48rem] flex-col gap-4 px-2 pb-10 text-sm">
      <div className="flex items-center justify-between gap-8">
        <div>
          {t("Estimated Fee")}{" "}
          <Tooltip placement="top">
            <TooltipTrigger asChild>
              <span>
                <InfoIcon className="inline align-text-top" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {transaction && txDetails && fromEvmNetwork?.nativeToken ? (
                <FeeTooltip
                  tokenId={fromEvmNetwork.nativeToken.id}
                  estimatedFee={txDetails.estimatedFee}
                  maxFee={txDetails.maxFee}
                  balance={fastBalance?.balance?.transferable?.planck}
                />
              ) : loadableState === "loading" ? (
                <div className="flex flex-col gap-2 whitespace-nowrap text-sm">
                  <div className="flex w-full justify-between gap-8">
                    <div>{t("Estimated Fee:")}</div>
                    <div>
                      <div
                        className={"text-body-disabled bg-body-disabled rounded-xs animate-pulse"}
                      >
                        Loading
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full justify-between gap-8">
                    <div>{t("Max Fee:")}</div>
                    <div>
                      <div
                        className={"text-body-disabled bg-body-disabled rounded-xs animate-pulse"}
                      >
                        Loading
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full justify-between gap-8">
                    <div>{t("Balance:")}</div>
                    <div>
                      <div
                        className={"text-body-disabled bg-body-disabled rounded-xs animate-pulse"}
                      >
                        Loading
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </TooltipContent>
          </Tooltip>
        </div>
        {transaction?.type === "eip1559" ? (
          <div>{t("Priority")}</div>
        ) : (
          <div className={"text-body-disabled bg-body-disabled rounded-xs animate-pulse"}>
            {t("Priority")}
          </div>
        )}
      </div>

      {loadableState === "loading" ? (
        <div className="flex items-center justify-between gap-8">
          <div className={"text-body-disabled bg-body-disabled rounded-xs h-12 animate-pulse"}>
            0.0000 TKN ($0.00)
          </div>
          <div className={"text-body-disabled bg-body-disabled rounded-xs h-12 animate-pulse"}>
            0.0000 TKN ($0.00)
          </div>
        </div>
      ) : transaction && txDetails && fromEvmNetwork?.nativeToken ? (
        <div className="flex items-center justify-between gap-8">
          <div className="h-12">
            <TokensAndFiat
              tokenId={fromEvmNetwork.nativeToken.id}
              planck={txDetails.estimatedFee.toString()}
            />
          </div>
          <div className="h-12">
            <EthFeeSelect
              tx={transaction}
              tokenId={fromEvmNetwork.nativeToken.id}
              disabled={isPayloadLocked}
              gasSettingsByPriority={gasSettingsByPriority}
              setCustomSettings={setCustomSettings}
              txDetails={txDetails}
              priority={priority}
              onChange={handleFeeChange}
              networkUsage={networkUsage}
              drawerContainerId="SwapTokensModalDialog"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
