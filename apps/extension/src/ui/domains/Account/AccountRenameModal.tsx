import { atom, useAtom } from "jotai"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Modal, ModalDialog } from "talisman-ui"

import { AccountJsonAny } from "@extension/core"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import { usePortfolioNavigation } from "../Portfolio/usePortfolioNavigation"
import { AccountRename } from "./AccountRename"

const accountRenameAccountState = atom<AccountJsonAny | null>(null)

export const useAccountRenameModal = () => {
  const [_account, setAccount] = useAtom(accountRenameAccountState)

  const { selectedAccount } = usePortfolioNavigation()
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("accountRenameModal")

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
