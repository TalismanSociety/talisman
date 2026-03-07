import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { SettingsIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { Modal, PillButton, useOpenClose, WizardModalDialog } from "@ui/talisman-ui"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import { BittensorValidatorPicker } from "./BittensorValidatorPicker"

export const SelectValidatorPill: FC<{
  netuid: number
  hotkey: string | null
  onSelect: (hotkey: string) => void
}> = ({ netuid, hotkey, onSelect }) => {
  const { t } = useTranslation()

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
              networkId={BITTENSOR_NETWORK_ID}
              netuid={netuid}
              hotkey={hotkey}
              onSelect={handleSelect}
            />
          </WizardModalDialog>
        </PopupSizeModalContainer>
      </Modal>
    </>
  )
}
