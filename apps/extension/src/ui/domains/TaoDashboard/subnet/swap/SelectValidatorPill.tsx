import { SettingsIcon } from "@talismn/icons"
import { Modal } from "@ui/components/Modal"
import { PillButton } from "@ui/components/PillButton"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/hooks/bittensor/useCombinedBittensorValidatorsData"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { cn } from "@ui/util/cn"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useTaoDashboardNetworkId } from "../../shared/TaoDashboardNetworkProvider"
import { BittensorValidatorPicker } from "./BittensorValidatorPicker"

export const SelectValidatorPill: FC<{
  netuid: number
  hotkey: string | null
  onSelect: (hotkey: string) => void
}> = ({ netuid, hotkey, onSelect }) => {
  const { t } = useTranslation()
  const networkId = useTaoDashboardNetworkId()

  // preload validator + yield data so the picker doesn't flicker on open
  useCombinedBittensorValidatorsData(networkId, netuid)

  const { open, isOpen, close } = useOpenClose()

  const handleSelect = useCallback(
    (address: string) => {
      onSelect(address)
      close()
    },
    [onSelect, close]
  )

  return (
    <>
      <PillButton
        className={cn(
          "flex h-14 items-center gap-2 overflow-hidden rounded bg-grey-800 px-4 font-medium text-body-secondary text-sm hover:bg-grey-700"
        )}
        onClick={open}
      >
        <div className="flex items-center gap-2">
          {hotkey ? <BittensorValidatorName hotkey={hotkey} /> : t("Select Validator")}
          <SettingsIcon />
        </div>
      </PillButton>
      <Modal isOpen={isOpen} onDismiss={close}>
        <PopupSizeModalContainer id="select-validator-picker-modal">
          <WizardModalDialog
            title={t("Select validator")}
            onCloseClick={close}
            className="size-full border-none"
            contentClassName="p-0"
          >
            <BittensorValidatorPicker
              networkId={networkId}
              netuid={netuid}
              hotkey={hotkey}
              containerId="select-validator-picker-modal"
              onSelect={handleSelect}
              onClose={close}
            />
          </WizardModalDialog>
        </PopupSizeModalContainer>
      </Modal>
    </>
  )
}
