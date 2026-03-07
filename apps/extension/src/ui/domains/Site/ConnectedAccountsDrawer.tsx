import { AppPill } from "@talisman/components/AppPill"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { XIcon } from "@talismn/icons"
import { Drawer } from "@ui/components/Drawer"
import { IconButton } from "@ui/components/IconButton"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import type { FC } from "react"

import { ConnectedAccounts } from "./ConnectedAccounts"

type Props = {
  open: boolean
  onClose: () => void
}

const ConnectedAccountsDrawer: FC<Props> = ({ open, onClose }) => {
  const { id, url } = useCurrentSite()

  if (!id) return null
  return (
    <Drawer className="w-full" containerId="main" anchor="right" isOpen={open} onDismiss={onClose}>
      <div className="flex h-full flex-col bg-black">
        <header className="px-12 py-10 text-center">
          <AppPill url={url} />
          <IconButton className="absolute top-10 right-10" onClick={onClose}>
            <XIcon />
          </IconButton>
        </header>
        <ScrollContainer innerClassName="px-12">
          <ConnectedAccounts />
        </ScrollContainer>
      </div>
    </Drawer>
  )
}

export default ConnectedAccountsDrawer
