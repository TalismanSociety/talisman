import { EthGasSettings } from "@core/domains/ethereum/types"
import {
  EthPriorityOptionName,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@core/domains/signing/types"
import { TokenId } from "@core/domains/tokens/types"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { classNames } from "@talismn/util"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { ethers } from "ethers"
import { FC, useCallback, useEffect, useState } from "react"
import { Drawer, PillButton } from "talisman-ui"

import { FEE_PRIORITY_OPTIONS } from "./common"
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
  tx: ethers.providers.TransactionRequest
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
        <img src={FEE_PRIORITY_OPTIONS[priority].icon} alt="" className="inline-block w-10" />{" "}
        <span className="align-middle">{FEE_PRIORITY_OPTIONS[priority].label}</span>
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
