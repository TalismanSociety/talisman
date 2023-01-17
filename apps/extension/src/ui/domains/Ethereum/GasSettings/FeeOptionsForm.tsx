import {
  EthPriorityOptionName,
  EthPriorityOptionNameEip1559,
  EthPriorityOptionNameLegacy,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@core/domains/signing/types"
import { WithTooltip } from "@talisman/components/Tooltip"
import { ChevronRightIcon, InfoIcon } from "@talisman/theme/icons"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { ethers } from "ethers"
import { FC, useCallback, useMemo } from "react"
import { classNames } from "talisman-ui"

import { NetworkUsage } from "../NetworkUsage"
import { FEE_PRIORITY_OPTIONS } from "./common"

type PriorityOptionProps = {
  priority: EthPriorityOptionName
  gasSettingsByPriority: GasSettingsByPriority
  selected?: boolean
  tokenId: string
  onClick?: () => void
}

const PriorityOption = ({
  priority,
  gasSettingsByPriority,
  selected,
  tokenId,
  onClick,
}: PriorityOptionProps) => {
  const maxFeePlanck = useMemo(() => {
    switch (gasSettingsByPriority.type) {
      case "eip1559": {
        const gasSettings = gasSettingsByPriority[priority as EthPriorityOptionNameEip1559]
        return ethers.BigNumber.from(gasSettings.gasLimit).mul(gasSettings.maxFeePerGas)
      }
      case "legacy": {
        const gasSettings = gasSettingsByPriority[priority as EthPriorityOptionNameLegacy]
        return ethers.BigNumber.from(gasSettings.gasLimit).mul(gasSettings.gasPrice)
      }
      default:
        throw new Error("Unknown gas settings type")
    }
  }, [gasSettingsByPriority, priority])

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
        <img src={FEE_PRIORITY_OPTIONS[priority].icon} alt="" className="w-16" />
      </div>
      <div className="grow">{FEE_PRIORITY_OPTIONS[priority].label}</div>
      {selected || priority !== "custom" ? (
        <div>
          <TokensAndFiat tokenId={tokenId} planck={maxFeePlanck.toString()} />
        </div>
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
  const handleSelect = useCallback(
    (priority: EthPriorityOptionName) => () => {
      if (onChange) onChange(priority)
    },
    [onChange]
  )

  return (
    <div className="text-body-secondary bg-black-tertiary flex flex-col gap-12 rounded-t-xl p-12 text-sm">
      <h3 className="text-body mb-0 text-center text-base font-bold">Fee Options</h3>
      <div>
        This network requires a fee to validate your transaction. The fee will vary depending on how
        busy the network is. You can adjust the fee and priority depending on the urgency of your
        transaction.
      </div>
      <div className="w-full">
        <div className="flex w-full justify-between">
          <div>Priority</div>
          <div>
            Max Transaction Fee{" "}
            <WithTooltip
              tooltip="This is the absolute maximum fee you could pay for this transaction. You usually
                  pay well below this fee, depending on network usage and stability."
            >
              <InfoIcon className="inline-block align-text-top" />
            </WithTooltip>
          </div>
        </div>
        {gasSettingsByPriority.type === "eip1559" && (
          <>
            <PriorityOption
              gasSettingsByPriority={gasSettingsByPriority}
              tokenId={tokenId}
              priority={"low"}
              onClick={handleSelect("low")}
              selected={priority === "low"}
            />
            <PriorityOption
              gasSettingsByPriority={gasSettingsByPriority}
              tokenId={tokenId}
              priority={"medium"}
              onClick={handleSelect("medium")}
              selected={priority === "medium"}
            />
            <PriorityOption
              gasSettingsByPriority={gasSettingsByPriority}
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
            tokenId={tokenId}
            priority={"recommended"}
            onClick={handleSelect("recommended")}
            selected={priority === "recommended"}
          />
        )}
        <PriorityOption
          gasSettingsByPriority={gasSettingsByPriority}
          tokenId={tokenId}
          priority={"custom"}
          onClick={handleSelect("custom")}
          selected={priority === "custom"}
        />
        {txDetails.baseFeeTrend ? (
          <div className="mt-8 flex w-full items-center justify-between">
            <div>Base Fee Trend</div>
            <div>
              <NetworkUsage baseFeeTrend={txDetails.baseFeeTrend} />
            </div>
          </div>
        ) : (
          <div className="mt-8 flex w-full items-center justify-between">
            <div>Network Usage</div>
            <div>
              {networkUsage === undefined ? "N/A" : <>{Math.round(networkUsage * 100)} %</>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
