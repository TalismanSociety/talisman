import {} from "@talisman/util/provideContext"

import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useOpenCloseGlobal } from "@talisman/hooks/useOpenClose"
import { selectedAccountQuery } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useRecoilValue } from "recoil"

import AccountRename from "./Rename"

export const useAccountRenameModal = () => {
  const account = useRecoilValue(selectedAccountQuery)
  const { isOpen, open, close } = useOpenCloseGlobal("ACCOUNT_RENAME_MODAL")

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

export const AccountRenameModal = () => {
  const { t } = useTranslation()
  const { account, close, isOpen } = useAccountRenameModal()

  return (
    <Modal open={isOpen}>
      <ModalDialog title={t("Rename account")} onClose={close}>
        {account?.address ? (
          <AccountRename address={account?.address} onConfirm={close} onCancel={close} />
        ) : null}
      </ModalDialog>
    </Modal>
  )
}
