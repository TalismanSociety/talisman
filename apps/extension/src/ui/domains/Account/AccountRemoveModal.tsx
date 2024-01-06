import { AccountJsonAny, AccountType } from "@core/domains/accounts/types"
import { useOpenCloseAtom } from "@talisman/hooks/useOpenClose"
import { api } from "@ui/api"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useCallback, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { atom, useRecoilState } from "recoil"
import { Button, Modal, ModalDialog } from "talisman-ui"

const accountRemoveAccountState = atom<AccountJsonAny | null>({
  key: "accountRemoveAccountState",
  default: null,
})
const accountRemoveModalOpenState = atom<boolean>({
  key: "accountRemoveModalOpenState",
  default: false,
})

export const useAccountRemoveModal = () => {
  const [_account, setAccount] = useRecoilState(accountRemoveAccountState)

  const { account: selectedAccount } = useSelectedAccount()
  const { isOpen, open: innerOpen, close } = useOpenCloseAtom(accountRemoveModalOpenState)

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
  }
}

// export const [AccountRemoveModalProvider, useAccountRemoveModal] = provideContext(
//   useAccountRemoveModalProvider
// )

export const AccountRemoveModal = () => {
  const { t } = useTranslation()
  const { account, close, isOpen } = useAccountRemoveModal()
  const navigate = useNavigate()

  // persist in state so text doesn't disappear upon deletion
  const [accountName, setAccountName] = useState<string>("")
  useEffect(() => {
    if (account) setAccountName(account.name ?? "")
  }, [account])

  const handleConfirm = useCallback(async () => {
    if (!account) return
    await api.accountForget(account?.address)
    if (window.location.pathname === "/popup.html") navigate("/")
    close()
  }, [account, close, navigate])

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
