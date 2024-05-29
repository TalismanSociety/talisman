import {
  EthGasSettings,
  EthPriorityOptionName,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@extension/core"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { FC, useCallback, useEffect, useState } from "react"
import { Drawer, PillButton } from "talisman-ui"
import { TransactionRequest } from "viem"

import { useFeePriorityOptionsUI } from "./common"
import { CustomGasSettingsFormEip1559 } from "./CustomGasSettingsFormEip1559"
import { CustomGasSettingsFormLegacy } from "./CustomGasSettingsFormLegacy"
import { FeeOptionsSelectForm } from "./FeeOptionsForm"

const OpenFeeSelectTracker = () => {
  const { genericEvent } = useAnalytics()

  useEffect(() => {
    genericEvent("open evm fee select")
  }, [genericEvent])

  return null
}

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
  const { genericEvent } = useAnalytics()

  const [showCustomSettings, setShowCustomSettings] = useState(false)
  const { isOpen, open, close } = useOpenClose()

  useEffect(() => {
    if (isOpen) setShowCustomSettings(false)
  }, [isOpen])

  const setPriority = useCallback(
    (priority: EthPriorityOptionName) => {
      genericEvent("evm fee change", { priority })
      if (onChange) onChange(priority)
      close()
    },
    [close, genericEvent, onChange]
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
        className={classNames("h-12 pl-4", className)}
      >
        <img src={options[priority].icon} alt="" className="inline-block w-10" />{" "}
        <span className="align-middle">{options[priority].label}</span>
      </PillButton>
      <Drawer
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

        <OpenFeeSelectTracker />
      </Drawer>
    </>
  )
}
