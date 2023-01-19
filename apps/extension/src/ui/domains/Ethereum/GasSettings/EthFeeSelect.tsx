import { EthGasSettings } from "@core/domains/ethereum/types"
import {
  EthPriorityOptionName,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@core/domains/signing/types"
import { TokenId } from "@core/domains/tokens/types"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { ethers } from "ethers"
import { FC, useCallback, useEffect, useState } from "react"
import { PillButton } from "talisman-ui"

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
  drawerContainer?: HTMLElement | null
  onChange?: (priority: EthPriorityOptionName) => void
  setCustomSettings: (gasSettings: EthGasSettings) => void
}

export const EthFeeSelect: FC<EthFeeSelectProps> = ({
  tokenId,
  txDetails,
  onChange,
  priority,
  drawerContainer,
  gasSettingsByPriority,
  disabled,
  setCustomSettings,
  tx,
  networkUsage,
}) => {
  const { genericEvent } = useAnalytics()

  const [showCustomSettings, setShowCustomSettings] = useState(false)
  const { isOpen, open, close } = useOpenClose()

  useEffect(() => {
    if (!isOpen) setShowCustomSettings(false)
  }, [isOpen])

  const setPriority = useCallback(
    (priority: EthPriorityOptionName) => {
      genericEvent("evm fee change", { priority })
      if (onChange) onChange(priority)
      close()
      setShowCustomSettings(false)
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
      <PillButton disabled={disabled} type="button" onClick={open} className="h-12 pl-4">
        <img src={FEE_PRIORITY_OPTIONS[priority].icon} alt="" className="inline-block w-10" />{" "}
        <span className="align-middle">{FEE_PRIORITY_OPTIONS[priority].label}</span>
      </PillButton>
      <Drawer parent={drawerContainer} open={isOpen && !disabled} anchor="bottom" onClose={close}>
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
