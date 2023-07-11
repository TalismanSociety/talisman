import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

import { AccountRename } from "./AccountRename"

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
  const { t } = useTranslation()
  const { account, close, isOpen } = useAccountRenameModal()

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Rename account")} onClose={close}>
        {account?.address ? (
          <AccountRename address={account?.address} onConfirm={close} onCancel={close} />
        ) : null}
      </ModalDialog>
    </Modal>
  )
}
