import { CustomEvmNetwork, EvmNetwork } from "@extension/core"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { sleep } from "@talismn/util"
import { api } from "@ui/api"
import { FC, useCallback, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ModalDialog } from "talisman-ui"
import { Button, Modal } from "talisman-ui"

export const ResetEvmNetworkButton: FC<{ network: EvmNetwork | CustomEvmNetwork }> = ({
  network,
}) => {
  const { t } = useTranslation("admin")
  const { isOpen, open, close } = useOpenClose()
  const navigate = useNavigate()

  const handleConfirmReset = useCallback(async () => {
    if (!network) return
    try {
      await api.ethNetworkReset(network.id.toString())
      close()
      await sleep(350) // wait for atom to reflect changes
      navigate("/settings/networks-tokens/networks/ethereum")
    } catch (err) {
      notify({
        title: t("Failed to reset"),
        subtitle: (err as Error).message,
        type: "error",
      })
    }
  }, [close, navigate, network, t])

  // keep name in memory to allow for popup closing animation
  const [networkName, setNetworkName] = useState<string>(() => network?.name ?? t("N/A"))
  useEffect(() => {
    if (network) setNetworkName(network?.name ?? t("N/A"))
  }, [network, t])

  return (
    <>
      <Button type="button" className="mt-8" onClick={open}>
        {t("Reset to defaults")}
      </Button>
      <Modal isOpen={isOpen} onDismiss={close}>
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
