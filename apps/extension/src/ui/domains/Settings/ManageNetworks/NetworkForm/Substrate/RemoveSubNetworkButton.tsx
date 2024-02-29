import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { Chain, CustomChain } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { FC, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ModalDialog } from "talisman-ui"
import { Button, Modal } from "talisman-ui"

export const RemoveSubNetworkButton: FC<{ chain: Chain | CustomChain }> = ({ chain }) => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()
  const { isOpen, open, close } = useOpenClose()

  const handleConfirmRemove = useCallback(async () => {
    if (!chain) return
    try {
      await api.chainRemove(chain.id)
      navigate("/settings/networks-tokens/networks/polkadot")
    } catch (err) {
      notify({
        title: t("Failed to remove"),
        subtitle: (err as Error).message,
        type: "error",
      })
    }
  }, [chain, navigate, t])

  const name = chain?.name ?? t("N/A")

  return (
    <>
      <Button type="button" className="mt-8" onClick={open}>
        {t("Remove Network")}
      </Button>
      <Modal isOpen={isOpen && !!chain} onDismiss={close}>
        <ModalDialog title={t("Remove Network")} onClose={close}>
          <div className="text-body-secondary mt-4 space-y-16">
            <div className="text-base">
              <Trans t={t}>
                Network <span className="text-body">{name}</span> and associated tokens will be
                removed from Talisman.
              </Trans>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Button onClick={close}>{t("Cancel")}</Button>
              <Button primary onClick={handleConfirmRemove}>
                {t("Remove")}
              </Button>
            </div>
          </div>
        </ModalDialog>
      </Modal>
    </>
  )
}
