import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import type { FC } from "react"

import { useBittensorConvictionLockModal } from "../hooks/useBittensorConvictionLockModal"
import {
  BITTENSOR_LOCK_MODAL_CONTAINER_ID,
  BittensorConvictionLockContent,
} from "./BittensorConvictionLockContent"

export const BittensorConvictionLockModal: FC = () => {
  const { isOpen, args, close } = useBittensorConvictionLockModal()

  return (
    <Modal isOpen={isOpen && !!args} onDismiss={close}>
      <PopupSizeModalContainer id={BITTENSOR_LOCK_MODAL_CONTAINER_ID}>
        {!!args && (
          <BittensorConvictionLockContent
            // reset wizard state whenever it is opened for a different subnet/account
            key={`${args.networkId}-${args.netuid}-${args.address ?? ""}`}
            networkId={args.networkId}
            netuid={args.netuid}
            seedAddress={args.address}
            seedHotkey={args.hotkey}
            onClose={close}
          />
        )}
      </PopupSizeModalContainer>
    </Modal>
  )
}
