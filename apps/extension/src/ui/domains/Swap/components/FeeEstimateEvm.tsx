import type {
  EthGasSettings,
  EthPriorityOptionName,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@core/types/domains"
import { InfoIcon } from "@talismn/icons"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { FeeTooltip } from "@ui/domains/Ethereum/FeeTooltip"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { QuoteProvider } from "@ui/domains/Swap/components/QuoteProvider"
import { useNetworkById } from "@ui/state/chaindata"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import { useAtomValue } from "jotai"
import { useTranslation } from "react-i18next"
import type { TransactionRequest } from "viem"

import { fromAssetAtom } from "../swap-modules/common.swap-module"
import type { useFastBalance } from "../swaps-port/useFastBalance"

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
  const fromEvmNetwork = useNetworkById(fromAsset?.chainId?.toString(), "ethereum")

  if (loadableState === "hasError") return null
  return (
    <div className="relative flex min-h-[4.48rem] w-full flex-col gap-4 rounded bg-grey-900 px-12 py-8">
      <QuoteProvider />

      {transaction?.type === undefined || transaction?.type === "eip1559" ? (
        <div className="flex h-10 items-center justify-between">
          <div className="text-body-secondary text-xs">{t("Priority")}</div>
          {loadableState === "hasData" &&
          transaction &&
          txDetails &&
          fromEvmNetwork?.nativeTokenId ? (
            <EthFeeSelect
              className="h-10"
              tx={transaction}
              tokenId={fromEvmNetwork.nativeTokenId}
              disabled={isPayloadLocked}
              gasSettingsByPriority={gasSettingsByPriority}
              setCustomSettings={setCustomSettings}
              txDetails={txDetails}
              priority={priority}
              onChange={handleFeeChange}
              networkUsage={networkUsage}
              drawerContainerId="SwapTokensModalDialog"
            />
          ) : (
            <div className={"h-10 animate-pulse rounded-xs bg-body-disabled text-body-disabled"}>
              0.0000 TKN ($0.00)
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="text-body-secondary text-xs">
          {t("Estimated TX Fee")}{" "}
          <Tooltip placement="top">
            <TooltipTrigger asChild>
              <span>
                <InfoIcon className="inline align-text-top" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {loadableState === "hasData" &&
              transaction &&
              txDetails &&
              fromEvmNetwork?.nativeTokenId ? (
                <FeeTooltip
                  tokenId={fromEvmNetwork.nativeTokenId}
                  estimatedFee={txDetails.estimatedFee}
                  maxFee={txDetails.maxFee}
                  balance={fastBalance?.balance?.transferable?.planck}
                />
              ) : (
                <div className="flex flex-col gap-2 whitespace-nowrap text-xs">
                  <div className="flex w-full justify-between gap-8 text-xs">
                    {t("Estimated TX Fee")}{" "}
                    <div>
                      <div
                        className={"animate-pulse rounded-xs bg-body-disabled text-body-disabled"}
                      >
                        Loading
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full justify-between gap-8">
                    <div>{t("Max Fee:")}</div>
                    <div>
                      <div
                        className={"animate-pulse rounded-xs bg-body-disabled text-body-disabled"}
                      >
                        Loading
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full justify-between gap-8">
                    <div>{t("Balance:")}</div>
                    <div>
                      <div
                        className={"animate-pulse rounded-xs bg-body-disabled text-body-disabled"}
                      >
                        Loading
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
        {loadableState === "hasData" &&
        transaction &&
        txDetails &&
        fromEvmNetwork?.nativeTokenId ? (
          <div className="h-10">
            <TokensAndFiat
              className="text-body-secondary text-xs"
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
              tokenId={fromEvmNetwork.nativeTokenId}
              planck={txDetails.estimatedFee.toString()}
            />
          </div>
        ) : (
          <div className={"h-10 animate-pulse rounded-xs bg-body-disabled text-body-disabled"}>
            0.0000 TKN ($0.00)
          </div>
        )}
      </div>
    </div>
  )
}
