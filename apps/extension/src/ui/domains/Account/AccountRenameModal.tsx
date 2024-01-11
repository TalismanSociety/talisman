import { AccountJsonAny } from "@core/domains/accounts/types"
import { useRecoilOpenClose } from "@talisman/hooks/useOpenClose"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { atom, useRecoilState } from "recoil"
import { ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

import { AccountRename } from "./AccountRename"

const accountRenameAccountState = atom<AccountJsonAny | null>({
  key: "accountRenameAccountState",
  default: null,
})
const accountRenameModalOpenState = atom<boolean>({
  key: "accountRenameModalOpenState",
  default: false,
})

export const useAccountRenameModal = () => {
  const [_account, setAccount] = useRecoilState(accountRenameAccountState)

  const { account: selectedAccount } = useSelectedAccount()
  const { isOpen, open: innerOpen, close } = useRecoilOpenClose(accountRenameModalOpenState)

  const open = useCallback(
    (account?: AccountJsonAny) => {
      setAccount(account ?? null)
      innerOpen()
    },
    [innerOpen, setAccount]
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
