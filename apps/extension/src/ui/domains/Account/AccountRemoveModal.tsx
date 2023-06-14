import StyledDialog from "@talisman/components/Dialog"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useOpenCloseGlobal } from "@talisman/hooks/useOpenClose"
import { IconAlert } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { selectedAccountQuery } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { selector, useRecoilValue } from "recoil"

const REMOVABLE_ORIGINS = ["DERIVED", "SEED", "JSON", "QR", "HARDWARE"]

const canRemoveSelectedAccountQuery = selector({
  key: "canRemoveSelectedAccountQuery",
  get: ({ get }) => {
    const account = get(selectedAccountQuery)
    return REMOVABLE_ORIGINS.includes(account?.origin as string)
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const useAccountRemoveModal = () => {
  const account = useRecoilValue(selectedAccountQuery)
  const canRemove = useRecoilValue(canRemoveSelectedAccountQuery)
  const { isOpen, open, close } = useOpenCloseGlobal("ACCOUNT_REMOVE_MODAL")

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
