import type { Account } from "@core/domains/keyring/exports"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"

import { usePortfolioNavigation } from "../Portfolio/usePortfolioNavigation"
import { AccountRename } from "./AccountRename"

const [useAccountRenameOpenClose] = createGlobalOpenClose<Account | null>()

export const useAccountRenameModal = () => {
  const { isOpen, open: innerOpen, close, args } = useAccountRenameOpenClose()

  const { selectedAccount } = usePortfolioNavigation()
  const account = args ?? selectedAccount

  const open = useCallback((account?: Account) => innerOpen(account ?? null), [innerOpen])

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
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
      <ModalDialog className="h-auto" title={t("Rename account")} onCloseClick={close}>
        {account?.address ? (
          <AccountRename address={account.address} onConfirm={close} onCancel={close} />
        ) : null}
      </ModalDialog>
    </Modal>
  )
}
