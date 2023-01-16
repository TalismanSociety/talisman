import { EthGasSettings } from "@core/domains/ethereum/types"
import {
  EthPriorityOptionName,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@core/domains/signing/types"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { EvmNativeToken } from "@talismn/balances-evm-native"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { ethers } from "ethers"
import { FC, useCallback, useEffect, useState } from "react"
import { PillButton } from "talisman-ui"

import { FEE_PRIORITY_OPTIONS } from "./common"
import { CustomGasSettingsForm } from "./CustomGasSettingsForm"
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
  nativeToken: EvmNativeToken
  disabled?: boolean
  txDetails: EthTransactionDetails
  networkUsage?: number
  gasSettingsByPriority?: GasSettingsByPriority
  priority: EthPriorityOptionName
  decimals: number
  symbol?: string
  onChange?: (priority: EthPriorityOptionName) => void
  drawerContainer?: HTMLElement | null
  setCustomSettings: (gasSettings: EthGasSettings) => void
}

export const EthFeeSelect: FC<EthFeeSelectProps> = ({
  nativeToken,
  txDetails,
  onChange,
  priority,
  drawerContainer,
  gasSettingsByPriority,
  disabled,
  setCustomSettings,
  tx,
  ...props
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

  // DEV
  // useEffect(() => {
  //   setShowCustomSettings(true)
  //   open()
  // }, [open])

  // this is only usefull with EIP-1559
  if (!gasSettingsByPriority) return null

  return (
    <>
      <PillButton disabled={disabled} type="button" onClick={open} className="h-12 pl-4">
        <img src={FEE_PRIORITY_OPTIONS[priority].icon} alt="" className="inline-block w-10" />{" "}
        <span className="align-middle">{FEE_PRIORITY_OPTIONS[priority].label}</span>
      </PillButton>
      <Drawer parent={drawerContainer} open={isOpen && !disabled} anchor="bottom" onClose={close}>
        {showCustomSettings ? (
          <CustomGasSettingsForm
            nativeToken={nativeToken}
            onCancel={handleCancelCustomSettings}
            onConfirm={handleSetCustomSettings}
            gasSettingsByPriority={gasSettingsByPriority}
            txDetails={txDetails}
            tx={tx}
            {...props}
          />
        ) : (
          <FeeOptionsSelectForm
            gasSettingsByPriority={gasSettingsByPriority}
            nativeToken={nativeToken}
            priority={priority}
            txDetails={txDetails}
            onChange={handleSelect}
            {...props}
          />
        )}
        <OpenFeeSelectTracker />
      </Drawer>
    </>
  )
}
