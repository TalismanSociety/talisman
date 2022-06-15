import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useState } from "react"
import AccountRename from "./Rename"

const useAccountRenameModalProvider = () => {
  const [address, setAddress] = useState<string>()

  const close = useCallback(() => setAddress(undefined), [])

  return {
    open: setAddress,
    close,
    address,
  }
}

export const [AccountRenameModalProvider, useAccountRenameModal] = provideContext(
  useAccountRenameModalProvider
)

export const AccountRenameModal = () => {
  const { address, close } = useAccountRenameModal()

  return (
    <Modal open={Boolean(address)}>
      <ModalDialog title="Rename account" onClose={close}>
        <AccountRename address={address!} onConfirm={close} onCancel={close} />
      </ModalDialog>
    </Modal>
  )
}
