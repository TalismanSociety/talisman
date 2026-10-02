import { networkIdForAnalytics } from "@common/analytics/funds"
import type { EthGasSettings } from "@core/domains/ethereum/types"
import type {
  EthPriorityOptionName,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@core/domains/signing/types"
import type { TokenId } from "@talismn/chaindata-provider"
import { track } from "@ui/api/track"
import { Drawer } from "@ui/components/Drawer"
import { PillButton } from "@ui/components/PillButton"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useEffect, useState } from "react"
import type { TransactionRequest } from "viem"
import { CustomGasSettingsFormEip1559 } from "./CustomGasSettingsFormEip1559"
import { CustomGasSettingsFormLegacy } from "./CustomGasSettingsFormLegacy"
import { useFeePriorityOptionsUI } from "./common"
import { FeeOptionsSelectForm } from "./FeeOptionsForm"

type EthFeeSelectProps = {
  tx: TransactionRequest
  tokenId: TokenId
  disabled?: boolean
  txDetails: EthTransactionDetails
  networkUsage?: number
  gasSettingsByPriority?: GasSettingsByPriority
  priority?: EthPriorityOptionName
  drawerContainerId?: string
  className?: string
  onChange?: (priority: EthPriorityOptionName) => void
  setCustomSettings: (gasSettings: EthGasSettings) => void
}

export const EthFeeSelect: FC<EthFeeSelectProps> = ({
  tokenId,
  txDetails,
  onChange,
  priority,
  drawerContainerId,
  gasSettingsByPriority,
  disabled,
  setCustomSettings,
  tx,
  networkUsage,
  className,
}) => {
  const options = useFeePriorityOptionsUI()
  const network = useNetworkById(useToken(tokenId)?.networkId)

  const [showCustomSettings, setShowCustomSettings] = useState(false)
  const { isOpen, open, close } = useOpenClose()

  useEffect(() => {
    if (isOpen) setShowCustomSettings(false)
  }, [isOpen])

  const setPriority = useCallback(
    (next: EthPriorityOptionName) => {
      if (onChange) onChange(next)
      if (gasSettingsByPriority && (next !== priority || next === "custom"))
        track("fee_priority_changed", {
          fee_priority: next,
          network_id: networkIdForAnalytics(network),
          gas_type: gasSettingsByPriority.type,
        })
      close()
    },
    [close, gasSettingsByPriority, network, onChange, priority]
  )

  const handleSelect = useCallback(
    (priority: EthPriorityOptionName) => {
      if (priority === "custom") setShowCustomSettings(true)
      else setPriority(priority)
    },
    [setPriority]
  )

  const handleSetCustomSettings = useCallback(
    (gasSettings: EthGasSettings) => {
      setCustomSettings(gasSettings)
      setPriority("custom")
    },
    [setCustomSettings, setPriority]
  )

  const handleCancelCustomSettings = useCallback(() => {
    setShowCustomSettings(false)
  }, [])

  if (!gasSettingsByPriority || !priority) return null

  return (
    <>
      <PillButton
        disabled={disabled}
        type="button"
        onClick={open}
        className={cn("h-12 pl-4", className)}
      >
        <img src={options[priority].icon} alt="" className="inline-block w-10" />{" "}
        <span className="align-middle">{options[priority].label}</span>
      </PillButton>
      <Drawer
        analyticsId="eth_fee_select"
        containerId={drawerContainerId}
        isOpen={isOpen && !disabled}
        anchor="bottom"
        onDismiss={close}
      >
        {showCustomSettings && gasSettingsByPriority.type === "eip1559" && (
          <CustomGasSettingsFormEip1559
            tokenId={tokenId}
            onCancel={handleCancelCustomSettings}
            onConfirm={handleSetCustomSettings}
            gasSettingsByPriority={gasSettingsByPriority}
            txDetails={txDetails}
            tx={tx}
          />
        )}
        {showCustomSettings && gasSettingsByPriority.type === "legacy" && (
          <CustomGasSettingsFormLegacy
            tokenId={tokenId}
            onCancel={handleCancelCustomSettings}
            onConfirm={handleSetCustomSettings}
            gasSettingsByPriority={gasSettingsByPriority}
            txDetails={txDetails}
            tx={tx}
            networkUsage={networkUsage}
          />
        )}
        {!showCustomSettings && (
          <FeeOptionsSelectForm
            gasSettingsByPriority={gasSettingsByPriority}
            tokenId={tokenId}
            priority={priority}
            txDetails={txDetails}
            onChange={handleSelect}
            networkUsage={networkUsage}
          />
        )}
      </Drawer>
    </>
  )
}
