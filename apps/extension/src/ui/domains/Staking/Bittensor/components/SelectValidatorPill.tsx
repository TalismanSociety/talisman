import type { DotNetworkId } from "@talismn/chaindata-provider"
import { SettingsIcon } from "@talismn/icons"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { PillButton } from "@ui/components/PillButton"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { TX_PILL_CLASS_NAME } from "@ui/components/txPillClassName"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/Bittensor/hooks/useCombinedBittensorValidatorsData"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { cn } from "@ui/util/cn"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { BittensorHotkeyAvatar } from "./BittensorHotkeyAvatar"
import { BittensorValidatorPicker } from "./BittensorValidatorPicker"

const PILL_CLASS_NAME =
  "flex h-14 items-center gap-2 overflow-hidden rounded bg-grey-800 px-4 font-medium text-body-secondary text-sm"

export const SelectValidatorPill: FC<{
  networkId: DotNetworkId
  netuid: number
  hotkey: string | null
  onSelect?: (hotkey: string) => void
  /** "tx" sizes it for a transaction's detail rows */
  variant?: "default" | "tx"
}> = ({ networkId, netuid, hotkey, onSelect, variant = "default" }) => {
  const { t } = useTranslation()

  // preload validator + yield data so the picker doesn't flicker on open
  useCombinedBittensorValidatorsData(networkId, netuid)

  const { open, isOpen, close } = useOpenClose()

  const handleSelect = useCallback(
    (address: string) => {
      onSelect?.(address)
      close()
    },
    [onSelect, close]
  )

  if (!onSelect)
    return variant === "tx" ? (
      <div className="flex min-w-0 items-center gap-2 text-body text-xs">
        {hotkey ? <BittensorHotkeyAvatar hotkey={hotkey} /> : null}
        <BittensorValidatorName hotkey={hotkey} className="min-w-0 truncate" />
      </div>
    ) : (
      <div className={PILL_CLASS_NAME}>
        <BittensorValidatorName hotkey={hotkey} />
      </div>
    )

  const txLabel = hotkey ? (
    <BittensorValidatorName hotkey={hotkey} className="min-w-0 truncate" />
  ) : (
    t("Select Validator")
  )

  return (
    <>
      {variant === "tx" ? (
        <button type="button" className={TX_PILL_CLASS_NAME} onClick={open}>
          <SettingsIcon className="shrink-0" />
          {txLabel}
        </button>
      ) : (
        <PillButton className={cn(PILL_CLASS_NAME, "hover:bg-grey-700")} onClick={open}>
          <div className="flex items-center gap-2">
            {hotkey ? <BittensorValidatorName hotkey={hotkey} /> : t("Select Validator")}
            <SettingsIcon />
          </div>
        </PillButton>
      )}
      <Modal analyticsId="select_validator" isOpen={isOpen} onDismiss={close}>
        <PopupSizeModalContainer id="select-validator-picker-modal">
          <ModalDialog
            variant="wizard"
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
          </ModalDialog>
        </PopupSizeModalContainer>
      </Modal>
    </>
  )
}
