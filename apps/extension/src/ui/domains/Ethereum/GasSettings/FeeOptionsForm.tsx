import { getTotalFeesFromGasSettings, isAcalaEvmPlus } from "@extension/core"
import {
  EthPriorityOptionName,
  EthPriorityOptionNameEip1559,
  EthPriorityOptionNameLegacy,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@extension/core"
import { BalanceFormatter } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import useToken from "@ui/hooks/useToken"
import { FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { NetworkUsage } from "../NetworkUsage"
import { useFeePriorityOptionsUI } from "./common"

const getGasSettings = (
  gasSettingsByPriority: GasSettingsByPriority,
  priority: EthPriorityOptionName
) => {
  switch (gasSettingsByPriority.type) {
    case "eip1559":
      return gasSettingsByPriority[priority as EthPriorityOptionNameEip1559]
    case "legacy":
      return gasSettingsByPriority[priority as EthPriorityOptionNameLegacy]
    default:
      throw new Error("Unknown gas settings type")
  }
}

const Eip1559FeeTooltip: FC<{
  estimatedFee: bigint
  maxFee: bigint
  tokenId: TokenId
}> = ({ estimatedFee, maxFee, tokenId }) => {
  const { t } = useTranslation("request")
  const token = useToken(tokenId)

  // get estimated and max as string, with as many decimals on both for easy reading
  const { estimated, max } = useMemo(() => {
    if (!token) return { estimated: undefined, max: undefined }

    const balEstimatedFee = new BalanceFormatter(estimatedFee.toString(), token.decimals)
    const balMaxFee = new BalanceFormatter(maxFee.toString(), token.decimals)

    const [intEstimated, decEstimated = ""] = balEstimatedFee.tokens.split(".")
    const [intMax, decMax = ""] = balMaxFee.tokens.split(".")
    const maxDecimals = Math.max(decEstimated.length ?? 0, decMax.length ?? 0)

    return maxDecimals === 0
      ? {
          estimated: `${intEstimated} ${token.symbol}`,
          max: `${intMax} ${token.symbol}`,
        }
      : {
          estimated: `${intEstimated}.${decEstimated.padEnd(maxDecimals, "0")} ${token.symbol}`,
          max: `${intMax}.${decMax.padEnd(maxDecimals, "0")} ${token.symbol}`,
        }
  }, [estimatedFee, maxFee, token])

  if (!estimated || !max) return null

  return (
    <>
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex w-full items-center justify-between gap-4">
          <div>{t("Estimated Fee:")}</div>
          <div className="font-mono">{estimated}</div>
        </div>
        <div className="flex w-full items-center justify-between gap-4">
          <div>{t("Maximum Fee:")}</div>
          <div className="font-mono">{max}</div>
        </div>
      </div>
    </>
  )
}

type PriorityOptionProps = {
  priority: EthPriorityOptionName
  gasSettingsByPriority: GasSettingsByPriority
  txDetails: EthTransactionDetails
  selected?: boolean
  tokenId: string
  onClick?: () => void
}

const PriorityOption = ({
  priority,
  gasSettingsByPriority,
  txDetails,
  selected,
  tokenId,
  onClick,
}: PriorityOptionProps) => {
  const { estimatedFee, maxFee } = useMemo(() => {
    const gasSettings = getGasSettings(gasSettingsByPriority, priority)
    return getTotalFeesFromGasSettings(
      gasSettings,
      txDetails.estimatedGas,
      txDetails.baseFeePerGas,
      txDetails.estimatedL1DataFee ?? 0n
    )
  }, [
    gasSettingsByPriority,
    priority,
    txDetails.baseFeePerGas,
    txDetails.estimatedGas,
    txDetails.estimatedL1DataFee,
  ])

  const options = useFeePriorityOptionsUI()

  return (
    <button
      onClick={onClick}
      type="button"
      className={classNames(
        "hover:bg-grey-700 mt-4 flex h-28 w-full cursor-pointer items-center gap-6 rounded-sm border-none px-6 text-left font-semibold outline-none hover:text-white",
        selected ? "bg-grey-700 text-white" : "text-body-secondary bg-grey-750"
      )}
    >
      <div>
        <img src={options[priority].icon} alt="" className="w-16" />
      </div>
      <div className="grow">{options[priority].label}</div>
      {selected || priority !== "custom" ? (
        <Tooltip placement="bottom-end">
          <TooltipTrigger>
            <TokensAndFiat
              tokenId={tokenId}
              planck={estimatedFee.toString()}
              noTooltip={gasSettingsByPriority.type === "eip1559"}
            />
          </TooltipTrigger>
          {/* If EIP1559, display both estimated and max fees in tooltip */}
          {gasSettingsByPriority.type === "eip1559" && (
            <TooltipContent>
              <Eip1559FeeTooltip tokenId={tokenId} estimatedFee={estimatedFee} maxFee={maxFee} />
            </TooltipContent>
          )}
        </Tooltip>
      ) : (
        <ChevronRightIcon className="text-lg transition-none" />
      )}
    </button>
  )
}

type FeeOptionsSelectProps = {
  txDetails: EthTransactionDetails
  tokenId: string
  networkUsage?: number
  gasSettingsByPriority: GasSettingsByPriority
  priority: EthPriorityOptionName
  onChange?: (priority: EthPriorityOptionName) => void
}

export const FeeOptionsSelectForm: FC<FeeOptionsSelectProps> = ({
  txDetails,
  onChange,
  priority,
  gasSettingsByPriority,
  networkUsage,
  tokenId,
}) => {
  const { t } = useTranslation("request")
  const handleSelect = useCallback(
    (priority: EthPriorityOptionName) => () => {
      if (onChange) onChange(priority)
    },
    [onChange]
  )

  return (
    <div className="text-body-secondary bg-black-tertiary flex flex-col gap-12 rounded-t-xl p-12 text-sm">
      <h3 className="text-body mb-0 text-center text-base font-bold">{t("Fee Options")}</h3>
      <div>
        <Trans t={t}>
          This network requires a fee to validate your transaction. The fee will vary depending on
          how busy the network is. You can adjust the fee and priority depending on the urgency of
          your transaction.
        </Trans>
      </div>
      <div className="w-full">
        <div className="flex w-full justify-between">
          <div>{t("Priority")}</div>
          <div>{t("Estimated Fee")}</div>
        </div>
        {gasSettingsByPriority.type === "eip1559" && (
          <>
            <PriorityOption
              gasSettingsByPriority={gasSettingsByPriority}
              txDetails={txDetails}
              tokenId={tokenId}
              priority={"low"}
              onClick={handleSelect("low")}
              selected={priority === "low"}
            />
            <PriorityOption
              gasSettingsByPriority={gasSettingsByPriority}
              txDetails={txDetails}
              tokenId={tokenId}
              priority={"medium"}
              onClick={handleSelect("medium")}
              selected={priority === "medium"}
            />
            <PriorityOption
              gasSettingsByPriority={gasSettingsByPriority}
              txDetails={txDetails}
              tokenId={tokenId}
              priority={"high"}
              onClick={handleSelect("high")}
              selected={priority === "high"}
            />
          </>
        )}
        {gasSettingsByPriority.type === "legacy" && (
          <PriorityOption
            gasSettingsByPriority={gasSettingsByPriority}
            txDetails={txDetails}
            tokenId={tokenId}
            priority={"recommended"}
            onClick={handleSelect("recommended")}
            selected={priority === "recommended"}
          />
        )}
        {!isAcalaEvmPlus(txDetails.evmNetworkId) && (
          <PriorityOption
            gasSettingsByPriority={gasSettingsByPriority}
            txDetails={txDetails}
            tokenId={tokenId}
            priority={"custom"}
            onClick={handleSelect("custom")}
            selected={priority === "custom"}
          />
        )}
        {txDetails.baseFeeTrend ? (
          <div className="mt-8 flex w-full items-center justify-between">
            <div>{t("Base Fee Trend")}</div>
            <div>
              <NetworkUsage baseFeeTrend={txDetails.baseFeeTrend} />
            </div>
          </div>
        ) : (
          <div className="mt-8 flex w-full items-center justify-between">
            <div>{t("Network Usage")}</div>
            <div>
              {networkUsage === undefined ? t("N/A") : <>{Math.round(networkUsage * 100)} %</>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
