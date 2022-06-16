import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { useSelectedAccount } from "@ui/apps/dashboard/context"
import { useEffect } from "react"
import AccountRename from "./Rename"

const useAccountRenameModalProvider = () => {
  const { account } = useSelectedAccount()
  const { isOpen, open, close } = useOpenClose()

  useEffect(() => {
    close()
  }, [account, close])

  return {
    account,
    isOpen,
    open,
    close,
    canRename: Boolean(account),
  }
}

export const [AccountRenameModalProvider, useAccountRenameModal] = provideContext(
  useAccountRenameModalProvider
)

export const AccountRenameModal = () => {
  const { account, close, isOpen } = useAccountRenameModal()

  return (
    <Modal open={isOpen}>
      <ModalDialog title="Rename account" onClose={close}>
        <AccountRename address={account?.address!} onConfirm={close} onCancel={close} />
      </ModalDialog>
    </Modal>
  )
}
