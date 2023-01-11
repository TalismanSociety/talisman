import { EthGasSettingsEip1559 } from "@core/domains/ethereum/types"
import {
  EthBaseFeeTrend,
  EthPriorityOptionName,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@core/domains/signing/types"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import {
  NetworkUsageDecreasing,
  NetworkUsageHigh,
  NetworkUsageIdle,
  NetworkUsageIncreasing,
} from "@talisman/theme/icons"
import imgFeePriorityCustom from "@talisman/theme/images/fee-priority-custom.png"
import imgFeePriorityHigh from "@talisman/theme/images/fee-priority-high.png"
import imgFeePriorityLow from "@talisman/theme/images/fee-priority-low.png"
import imgFeePriorityMedium from "@talisman/theme/images/fee-priority-medium.png"
import { classNames } from "@talisman/util/classNames"
import { formatEtherValue } from "@talisman/util/formatEthValue"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { ethers } from "ethers"
import { FC, SVGProps, useCallback, useEffect, useMemo } from "react"
import { PillButton } from "talisman-ui"

const OPTIONS: Record<EthPriorityOptionName, { icon: string; label: string }> = {
  low: { icon: imgFeePriorityLow, label: "Low" },
  medium: { icon: imgFeePriorityMedium, label: "Normal" },
  high: { icon: imgFeePriorityHigh, label: "Urgent" },
  custom: { icon: imgFeePriorityCustom, label: "Custom" },
}

type EthFeeButtonProps = {
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
}: EthFeeButtonProps) => {
  const maxFee = useMemo(() => {
    const gasSettings = gasSettingsByPriority[priority] as EthGasSettingsEip1559
    return ethers.BigNumber.from(gasSettings.gasLimit).mul(gasSettings.maxFeePerGas)
  }, [gasSettingsByPriority, priority])

  return (
    <button
      onClick={onClick}
      type="button"
      className={classNames(
        "mt-4 flex h-28 w-full cursor-pointer items-center gap-6 rounded-sm border-none px-6 text-left font-semibold outline-none hover:bg-[#383838] hover:text-white",
        selected ? "bg-[#383838] text-white" : "text-body-secondary bg-[#2F2F2F] bg-gray-800"
      )}
    >
      <div>
        <img src={OPTIONS[priority].icon} alt="" className="w-16" />
      </div>
      <div className="grow">{OPTIONS[priority].label}</div>
      <div>{formatEtherValue(maxFee, decimals, symbol)}</div>
    </button>
  )
}

const OpenFeeSelectTracker = () => {
  const { genericEvent } = useAnalytics()

  useEffect(() => {
    genericEvent("open evm fee select")
  }, [genericEvent])

  return null
}

const NetworkUsageBase = ({
  text,
  icon: Icon,
}: {
  text: string
  icon: FC<SVGProps<SVGSVGElement>>
}) => {
  return (
    <div className="flex items-start gap-4 text-sm">
      <div className="leading-none">{text}</div>
      <Icon className="block h-[1em] w-auto" />
    </div>
  )
}

const NetworkUsage = ({ baseFeeTrend }: { baseFeeTrend?: EthBaseFeeTrend }) => {
  switch (baseFeeTrend) {
    case "idle":
      return <NetworkUsageBase text="Idle" icon={NetworkUsageIdle} />
    case "increasing":
      return <NetworkUsageBase text="Increasing" icon={NetworkUsageIncreasing} />
    case "decreasing":
      return <NetworkUsageBase text="Decreasing" icon={NetworkUsageDecreasing} />
    case "toTheMoon":
      return <NetworkUsageBase text="Very Busy" icon={NetworkUsageHigh} />
    default:
      return null
  }
}

type EthFeeSelectProps = {
  disabled?: boolean
  txDetails: EthTransactionDetails
  networkUsage?: number
  gasSettingsByPriority?: GasSettingsByPriority
  priority: EthPriorityOptionName
  decimals: number
  symbol?: string
  onChange?: (priority: EthPriorityOptionName) => void
  drawerContainer?: HTMLElement | null
}

export const EthFeeSelect = ({
  txDetails,
  onChange,
  priority,
  drawerContainer,
  gasSettingsByPriority,
  disabled,
  ...props
}: EthFeeSelectProps) => {
  const { genericEvent } = useAnalytics()

  const { isOpen, open, close } = useOpenClose()
  const handleSelect = useCallback(
    (priority: EthPriorityOptionName) => () => {
      genericEvent("evm fee change", { priority })
      if (onChange) onChange(priority)
      close()
    },
    [close, onChange, genericEvent]
  )

  // this is only usefull with EIP-1559
  if (!gasSettingsByPriority) return null

  return (
    <>
      <PillButton disabled={disabled} type="button" onClick={open} className="h-12 pl-4">
        <img src={OPTIONS[priority].icon} alt="" className="inline-block w-10" />{" "}
        {OPTIONS[priority].label}
      </PillButton>
      <Drawer parent={drawerContainer} open={isOpen && !disabled} anchor="bottom" onClose={close}>
        <div className="text-body-secondary bg-black-tertiary flex flex-col gap-12 rounded-t-xl p-12 text-sm">
          <h3 className="text-body mb-0 text-center text-base font-bold">Fee Options</h3>
          <div>
            This network requires a fee to validate your transaction. The fee will vary depending on
            how busy the network is. You can adjust the fee and priority depending on the urgency of
            your transaction.
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
          <OpenFeeSelectTracker />
        </div>
      </Drawer>
    </>
  )
}
