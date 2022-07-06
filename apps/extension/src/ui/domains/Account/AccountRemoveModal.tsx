import StyledDialog from "@talisman/components/Dialog"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { IconAlert } from "@talisman/theme/icons"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useState } from "react"

const useAccountRemoveModalProvider = () => {
  const [address, setAddress] = useState<string>()

  const close = useCallback(() => setAddress(undefined), [])

  return {
    open: setAddress,
    close,
    address,
  }
}

export const [AccountRemoveModalProvider, useAccountRemoveModal] = provideContext(
  useAccountRemoveModalProvider
)

export const AccountRemoveModal = () => {
  const { address, close } = useAccountRemoveModal()

  const handleConfirm = useCallback(async () => {
    if (!address) return
    await api.accountForget(address)
    close()
  }, [address, close])

  return (
    <Modal open={Boolean(address)} onClose={close}>
      <ModalDialog title="Remove account" onClose={close}>
        <StyledDialog
          icon={<IconAlert />}
          title="Are you sure?"
          text="Ensure you have backed up your secret phrase or private key before removing."
          confirmText="Remove"
          cancelText="Cancel"
          onConfirm={handleConfirm}
          onCancel={close}
        />
      </ModalDialog>
    </Modal>
  )
}
