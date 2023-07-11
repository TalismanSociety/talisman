import { AccountType } from "@core/domains/accounts/types"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

const REMOVABLE_ORIGINS: AccountType[] = ["DERIVED", "SEED", "WATCHED", "JSON", "QR", "HARDWARE"]

const useAccountRemoveModalProvider = () => {
  const { account } = useSelectedAccount()
  const { isOpen, open, close } = useOpenClose()

  const canRemove = useMemo(
    () => account?.origin && REMOVABLE_ORIGINS.includes(account?.origin),
    [account?.origin]
  )

  useEffect(() => {
    close()
  }, [account, close])

  return {
    account,
    isOpen,
    open,
    close,
    canRemove,
  }
}

export const [AccountRemoveModalProvider, useAccountRemoveModal] = provideContext(
  useAccountRemoveModalProvider
)

export const AccountRemoveModal = () => {
  const { t } = useTranslation()
  const { account, close, isOpen } = useAccountRemoveModal()

  // persist in state so text doesn't disappear upon deletion
  const [accountName, setAccountName] = useState<string>("")
  useEffect(() => {
    if (account) setAccountName(account.name ?? "")
  }, [account])

  const handleConfirm = useCallback(async () => {
    if (!account) return
    await api.accountForget(account?.address)
    close()
  }, [account, close])

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
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
          <p className="mt-4 text-sm">
            {t("Ensure you have backed up your recovery phrase or private key before removing.")}
          </p>
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
