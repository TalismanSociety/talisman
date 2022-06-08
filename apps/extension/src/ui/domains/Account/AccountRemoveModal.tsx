import { Modal } from "@talisman/components/Modal"
import StyledDialog from "@talisman/components/Dialog"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { IconAlert } from "@talisman/theme/icons"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSelectedAccount } from "@ui/apps/dashboard/context"
import { useOpenClose } from "@talisman/hooks/useOpenClose"

const REMOVABLE_ORIGINS = ["SEED", "JSON", "HARDWARE"]

const useAccountRemoveModalProvider = () => {
  const { account } = useSelectedAccount()
  const { isOpen, open, close } = useOpenClose()

  const canRemove = useMemo(
    () => REMOVABLE_ORIGINS.includes(account?.origin as string),
    [account?.origin]
  )

  useEffect(() => {
    close()
  }, [account, close])

  return {
    account,
    isOpen,
    open,
    close,
    canRemove,
  }
}

export const [AccountRemoveModalProvider, useAccountRemoveModal] = provideContext(
  useAccountRemoveModalProvider
)

export const AccountRemoveModal = () => {
  const { account, close, isOpen } = useAccountRemoveModal()

  const handleConfirm = useCallback(async () => {
    if (!account) return
    await api.accountForget(account?.address)
    close()
  }, [account, close])

  return (
    <Modal open={isOpen} onClose={close}>
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
