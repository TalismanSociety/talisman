import { bind } from "@react-rxjs/core"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { BehaviorSubject } from "rxjs"
import { Modal, ModalDialog } from "talisman-ui"

import { AccountJsonAny } from "@extension/core"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import { usePortfolioNavigation } from "../Portfolio/usePortfolioNavigation"
import { AccountRename } from "./AccountRename"

const localAccount$ = new BehaviorSubject<AccountJsonAny | null>(null)

const setLocalAccount = (account: AccountJsonAny | null) => {
  localAccount$.next(account)
}

const [useLocalAccount] = bind(localAccount$)

export const useAccountRenameModal = () => {
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("accountRenameModal")

  const { selectedAccount } = usePortfolioNavigation()
  const account = useLocalAccount() ?? selectedAccount

  const open = useCallback(
    (account?: AccountJsonAny) => {
      setLocalAccount(account ?? null)
      innerOpen()
    },
    [innerOpen],
  )

  useEffect(() => {
    close()
  }, [selectedAccount, close])

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
