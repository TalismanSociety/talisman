import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"

type ModalContentProps = {
  ModalHeader: React.ComponentType
  ModalBody: React.ComponentType
}

export const STAKING_MODAL_CONTENT_CONTAINER_ID = "StakingModalDialog"

export const ModalContent = ({ ModalHeader, ModalBody }: ModalContentProps) => {
  return (
    <div
      id={STAKING_MODAL_CONTENT_CONTAINER_ID} // acts as containerId for sub modals
      className={cn(
        "relative flex h-150 max-h-dvh w-100 max-w-dvw flex-col overflow-hidden bg-black",
        !IS_POPUP && "rounded border border-grey-850"
      )}
    >
      <ModalHeader />
      <div className="grow p-12 pt-0">
        <ModalBody />
      </div>
    </div>
  )
}
