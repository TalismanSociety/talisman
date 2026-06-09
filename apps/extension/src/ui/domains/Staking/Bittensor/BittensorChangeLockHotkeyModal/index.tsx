import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import type { FC } from "react"

import { useBittensorChangeLockHotkeyModal } from "../hooks/useBittensorChangeLockHotkeyModal"
import {
  BITTENSOR_CHANGE_LOCK_HOTKEY_MODAL_CONTAINER_ID,
  BittensorChangeLockHotkeyContent,
} from "./BittensorChangeLockHotkeyContent"

export const BittensorChangeLockHotkeyModal: FC = () => {
  const { isOpen, args, close } = useBittensorChangeLockHotkeyModal()

  return (
    <Modal isOpen={isOpen && !!args} onDismiss={close}>
      <PopupSizeModalContainer id={BITTENSOR_CHANGE_LOCK_HOTKEY_MODAL_CONTAINER_ID}>
        {!!args && (
          <BittensorChangeLockHotkeyContent
            key={`${args.networkId}-${args.netuid}-${args.address ?? ""}`}
            networkId={args.networkId}
            netuid={args.netuid}
            seedAddress={args.address}
            onClose={close}
          />
        )}
      </PopupSizeModalContainer>
    </Modal>
  )
}
