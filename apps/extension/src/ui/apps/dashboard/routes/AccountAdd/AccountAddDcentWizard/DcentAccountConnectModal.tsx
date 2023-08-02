import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { FC, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Modal, ModalDialog } from "talisman-ui"

import { DcentAccountConnectForm } from "./DcentAccountConnectForm"

export const DcentAccountConnectModal: FC<{
  address: string
  isOpen: boolean
  defaultName: string
  connect: (name: string) => Promise<string>
  onClose: () => void
}> = ({ isOpen, address, defaultName, connect, onClose }) => {
  const { t } = useTranslation("admin")
  const [isConnected, setIsConnected] = useState(false)
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  useEffect(() => {
    if (!isOpen) setIsConnected(false)
  }, [isOpen])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <ModalDialog
        title={isConnected ? t("Account connection complete") : t("Connect D'CENT account")}
        onClose={onClose}
      >
        {isConnected ? (
          <div>
            <p className="text-body-secondary">
              <Trans t={t}>
                You've successfully connected your account.
                <br />
                What would you like to do next?
              </Trans>
            </p>
            <div className="mt-12 grid grid-cols-2 gap-8">
              <Button onClick={() => setAddress(address)}>{t("View Portfolio")}</Button>
              <Button primary onClick={onClose}>
                {t("Connect More")}
              </Button>
            </div>
          </div>
        ) : (
          <DcentAccountConnectForm
            defaultName={defaultName}
            connect={connect}
            onCancel={onClose}
            onConnected={() => setIsConnected(true)}
          />
        )}
      </ModalDialog>
    </Modal>
  )
}
