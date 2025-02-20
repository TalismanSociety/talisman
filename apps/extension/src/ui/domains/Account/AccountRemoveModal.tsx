import { bind } from "@react-rxjs/core"
import { isEqual } from "lodash"
import { useCallback, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { BehaviorSubject, distinctUntilChanged } from "rxjs"
import { Button, Modal, ModalDialog } from "talisman-ui"

import { AccountJsonAny, AccountType } from "@extension/core"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { api } from "@ui/api"

import { usePortfolioNavigation } from "../Portfolio/usePortfolioNavigation"

const accountToRemove$ = new BehaviorSubject<AccountJsonAny | null>(null)
const [useAccount] = bind(
  accountToRemove$.pipe(distinctUntilChanged<AccountJsonAny | null>(isEqual)),
  null,
)

export const useAccountRemoveModal = () => {
  const _account = useAccount()

  const { selectedAccount } = usePortfolioNavigation()
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("accountRemoveModal")

  const open = useCallback(
    (account?: AccountJsonAny) => {
      accountToRemove$.next(account ?? null)
      innerOpen()
    },
    [innerOpen],
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
      <ModalDialog title={t("Remove account")} onClose={close}>
        <div className="text-body-secondary text-sm">
          <p className="text-sm">
            <Trans
              t={t}
              defaults="Confirm to remove account <Highlight>{{accountName}}</Highlight>."
              components={{ Highlight: <span className="text-body" /> }}
              values={{ accountName }}
            />
          </p>
          {account?.origin !== AccountType.Watched && (
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
