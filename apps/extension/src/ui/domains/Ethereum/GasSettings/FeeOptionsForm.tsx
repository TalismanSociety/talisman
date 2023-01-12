import { EthGasSettings, EthGasSettingsEip1559 } from "@core/domains/ethereum/types"
import {
  EthPriorityOptionName,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@core/domains/signing/types"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { formatEtherValue } from "@talisman/util/formatEthValue"
import { ethers } from "ethers"
import { FC, useCallback, useMemo } from "react"
import { classNames } from "talisman-ui"

import { NetworkUsage } from "../NetworkUsage"
import { FEE_PRIORITY_OPTIONS } from "./common"

type PriorityOptionProps = {
  priority: EthPriorityOptionName
  gasSettingsByPriority: GasSettingsByPriority
  selected?: boolean
  decimals: number
  symbol?: string
  onClick?: () => void
}

const PriorityOption = ({
  priority,
  gasSettingsByPriority,
  selected,
  decimals,
  symbol,
  onClick,
}: PriorityOptionProps) => {
  const maxFee = useMemo(() => {
    const gasSettings = gasSettingsByPriority[priority] as EthGasSettingsEip1559
    return ethers.BigNumber.from(gasSettings.gasLimit).mul(gasSettings.maxFeePerGas)
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
      <div>{formatEtherValue(maxFee, decimals, symbol)}</div>
    </button>
  )
}

type FeeOptionsSelectProps = {
  txDetails: EthTransactionDetails
  networkUsage?: number
  gasSettingsByPriority: GasSettingsByPriority
  priority: EthPriorityOptionName
  decimals: number
  symbol?: string
  onChange?: (priority: EthPriorityOptionName) => void
}

export const FeeOptionsSelectForm: FC<FeeOptionsSelectProps> = ({
  txDetails,
  onChange,
  priority,
  gasSettingsByPriority,
  ...props
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
          <div>Max transaction fee</div>
        </div>
        <PriorityOption
          gasSettingsByPriority={gasSettingsByPriority}
          {...props}
          priority={"low"}
          onClick={handleSelect("low")}
          selected={priority === "low"}
        />
        <PriorityOption
          gasSettingsByPriority={gasSettingsByPriority}
          {...props}
          priority={"medium"}
          onClick={handleSelect("medium")}
          selected={priority === "medium"}
        />
        <PriorityOption
          gasSettingsByPriority={gasSettingsByPriority}
          {...props}
          priority={"high"}
          onClick={handleSelect("high")}
          selected={priority === "high"}
        />
        <PriorityOption
          gasSettingsByPriority={gasSettingsByPriority}
          {...props}
          priority={"custom"}
          onClick={handleSelect("custom")}
          selected={priority === "custom"}
        />
        <div className="mt-8 flex w-full items-center justify-between">
          <div>Network usage</div>
          <div>
            <NetworkUsage baseFeeTrend={txDetails.baseFeeTrend} />
          </div>
        </div>
      </div>
    </div>
  )
}
