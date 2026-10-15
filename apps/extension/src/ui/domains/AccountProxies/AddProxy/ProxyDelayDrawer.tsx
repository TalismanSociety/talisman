import { XIcon } from "@talismn/icons"
import { Drawer } from "@ui/components/Drawer"
import { DrawerContent } from "@ui/components/DrawerContent"
import { IconButton } from "@ui/components/IconButton"
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
    <Drawer
      analyticsId="proxy_delay"
      anchor="bottom"
      isOpen={isOpen}
      onDismiss={onClose}
      containerId={containerId}
    >
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
    <DrawerContent className="flex max-h-full flex-col gap-8">
      <header className="flex shrink-0 items-center gap-8">
        <div className="size-12 shrink-0" />
        <h1 className="grow truncate text-center font-bold text-base">{t("Announcement Delay")}</h1>
        <IconButton onClick={onClose}>
          <XIcon />
        </IconButton>
      </header>
      <div className="scrollable scrollable-800 min-h-0 grow overflow-auto">
        <ProxyDelayForm delay={delay} onSave={onSave} onClose={onClose} />
      </div>
    </DrawerContent>
  )
}
