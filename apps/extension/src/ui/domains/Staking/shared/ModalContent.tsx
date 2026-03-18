import { classNames } from "@talismn/util"

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
      className={classNames(
        "relative flex h-[37.5rem] max-h-[100dvh] w-[25rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
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
