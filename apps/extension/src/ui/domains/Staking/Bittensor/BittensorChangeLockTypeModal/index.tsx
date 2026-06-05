import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import type { FC } from "react"

import { useBittensorChangeLockTypeModal } from "../hooks/useBittensorChangeLockTypeModal"
import {
  BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID,
  BittensorChangeLockTypeContent,
} from "./BittensorChangeLockTypeContent"

export const BittensorChangeLockTypeModal: FC = () => {
  const { isOpen, args, close } = useBittensorChangeLockTypeModal()

  return (
    <Modal isOpen={isOpen && !!args} onDismiss={close}>
      <PopupSizeModalContainer id={BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID}>
        {!!args && (
          <BittensorChangeLockTypeContent
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
