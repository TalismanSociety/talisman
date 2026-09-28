import type { Account } from "@core/domains/keyring/exports"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import { useCallback, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

import { usePortfolioNavigation } from "../Portfolio/usePortfolioNavigation"

const [useAccountRemoveOpenClose] = createGlobalOpenClose<Account | null>()

export const useAccountRemoveModal = () => {
  const { selectedAccount } = usePortfolioNavigation()
  const { isOpen, open: innerOpen, close, args } = useAccountRemoveOpenClose()

  const open = useCallback((account?: Account) => innerOpen(account ?? null), [innerOpen])

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    close()
  }, [selectedAccount, close])

  const account = args ?? selectedAccount

  return {
    account,
    isOpen,
    open,
    close,
  }
}

export const AccountRemoveModal = () => {
  const { t } = useTranslation()
  const { account, close, isOpen } = useAccountRemoveModal()
  const navigate = useNavigate()
  const location = useLocation()

  // persist in state so text doesn't disappear upon deletion
  const [accountName, setAccountName] = useState<string>("")
  useEffect(() => {
    if (account) setAccountName(account.name ?? "")
  }, [account])

  const handleConfirm = useCallback(async () => {
    if (!account) return
    await api.accountForget(account?.address)
    if (window.location.pathname === "/popup.html") navigate("/")
    else navigate(location.pathname) // removes all query params
    close()
  }, [account, close, location.pathname, navigate])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog className="h-auto" title={t("Remove account")} onCloseClick={close}>
        <div className="text-body-secondary text-sm">
          <p className="text-sm">
            <Trans
              t={t}
              defaults="Confirm to remove account <Highlight>{{accountName}}</Highlight>."
              components={{ Highlight: <span className="text-body" /> }}
              values={{ accountName }}
            />
          </p>
          {account?.type === "keypair" && (
            <p className="mt-4 text-sm">
              {t("Ensure you have backed up your recovery phrase or private key before removing.")}
            </p>
          )}
          <div className="mt-8 grid grid-cols-2 gap-8">
            <Button type="button" onClick={close}>
              {t("Cancel")}
            </Button>
            <Button primary onClick={handleConfirm}>
              {t("Remove")}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </Modal>
  )
}
