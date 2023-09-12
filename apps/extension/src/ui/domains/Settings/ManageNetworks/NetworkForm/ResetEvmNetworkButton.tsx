import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { api } from "@ui/api"
import { FC, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ModalDialog } from "talisman-ui"
import { Button, Modal } from "talisman-ui"

export const ResetEvmNetworkButton: FC<{ network: EvmNetwork | CustomEvmNetwork }> = ({
  network,
}) => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()
  const { isOpen, open, close } = useOpenClose()

  const handleConfirmReset = useCallback(async () => {
    if (!network) return
    try {
      await api.ethNetworkReset(network.id.toString())
      navigate("/networks?type=ethereum")
    } catch (err) {
      notify({
        title: t("Failed to reset"),
        subtitle: (err as Error).message,
        type: "error",
      })
    }
  }, [network, navigate, t])

  const networkName = network?.name ?? t("N/A")

  return (
    <>
      <Button type="button" className="mt-8" onClick={open}>
        {t("Reset to defaults")}
      </Button>
      <Modal isOpen={isOpen && !!network} onDismiss={close}>
        <ModalDialog title={t("Reset Network")} onClose={close}>
          <div className="text-body-secondary mt-4 space-y-16">
            <div className="text-base">
              <Trans t={t}>
                Network <span className="text-body">{networkName}</span> will be reset to Talisman's
                default settings.
              </Trans>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Button onClick={close}>{t("Cancel")}</Button>
              <Button primary onClick={handleConfirmReset}>
                {t("Reset")}
              </Button>
            </div>
          </div>
        </ModalDialog>
      </Modal>
    </>
  )
}
