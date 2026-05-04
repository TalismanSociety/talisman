import { Drawer } from "@ui/components/Drawer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { ProxyDelayForm } from "./ProxyDelayForm"

export const ProxyDelayDrawer: FC<{
  isOpen: boolean
  onClose: () => void
  containerId: string
  delay: string
  onSave: (delay: string) => void
}> = ({ containerId, isOpen, onClose, delay, onSave }) => {
  return (
    <Drawer anchor="bottom" isOpen={isOpen} onDismiss={onClose} containerId={containerId}>
      <Content delay={delay} onSave={onSave} onClose={onClose} />
    </Drawer>
  )
}

const Content: FC<{ delay: string; onSave: (delay: string) => void; onClose: () => void }> = ({
  delay,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation()

  return (
    <WizardModalDialog
      title={t("Announcement Delay")}
      onCloseClick={onClose}
      className="h-auto rounded-t-xl"
    >
      <ProxyDelayForm delay={delay} onSave={onSave} onClose={onClose} />
    </WizardModalDialog>
  )
}
