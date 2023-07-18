import { AccountJsonAny } from "@core/domains/accounts/types"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

import { AccountRename } from "./AccountRename"

const useAccountRenameModalProvider = () => {
  const [_account, setAccount] = useState<AccountJsonAny>()

  const { account: selectedAccount } = useSelectedAccount()
  const { isOpen, open: innerOpen, close } = useOpenClose()

  const open = useCallback(
    (account?: AccountJsonAny) => {
      setAccount(account)
      innerOpen()
    },
    [innerOpen]
  )

  useEffect(() => {
    close()
  }, [selectedAccount, close])

  const account = _account ?? selectedAccount

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
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Rename account")} onClose={close}>
        {account?.address ? (
          <AccountRename address={account.address} onConfirm={close} onCancel={close} />
        ) : null}
      </ModalDialog>
    </Modal>
  )
}
