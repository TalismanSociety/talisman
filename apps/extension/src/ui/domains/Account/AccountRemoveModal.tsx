import StyledDialog from "@talisman/components/Dialog"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { IconAlert } from "@talisman/theme/icons"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

const REMOVABLE_ORIGINS = ["DERIVED", "SEED", "JSON", "QR", "HARDWARE"]

const useAccountRemoveModalProvider = () => {
  const { account } = useSelectedAccount()
  const { isOpen, open, close } = useOpenClose()

  const canRemove = useMemo(
    () => REMOVABLE_ORIGINS.includes(account?.origin as string),
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
    <Modal open={isOpen} onClose={close}>
      <ModalDialog title={t("Remove account {{accountName}}", { accountName })} onClose={close}>
        <StyledDialog
          icon={<IconAlert />}
          title={t("Are you sure?")}
          text={t("Ensure you have backed up your recovery phrase or private key before removing.")}
          confirmText={t("Remove")}
          cancelText={t("Cancel")}
          onConfirm={handleConfirm}
          onCancel={close}
        />
      </ModalDialog>
    </Modal>
  )
}
