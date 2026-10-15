import { Drawer } from "@ui/components/Drawer"
import { DrawerContent } from "@ui/components/DrawerContent"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { BittensorSlippageForm } from "../../shared/BittensorSlippageForm"

export const BittensorSlippageDrawer: FC<{
  isOpen: boolean
  onClose: () => void
  containerId: string
  netuid: number | null
}> = ({ containerId, isOpen, netuid, onClose }) => {
  return (
    <Drawer
      analyticsId="bittensor_bond_slippage"
      anchor="bottom"
      isOpen={isOpen}
      onDismiss={onClose}
      containerId={containerId}
    >
      <Content netuid={netuid} onClose={onClose} />
    </Drawer>
  )
}

const Content: FC<{ netuid: number | null; onClose: () => void }> = ({ netuid, onClose }) => {
  const { t } = useTranslation()

  return (
    <DrawerContent className="flex flex-col items-center gap-4">
      <div className="pb-8 font-bold text-body">{t("Slippage Tolerance")}</div>
      <BittensorSlippageForm netuid={netuid} onClose={onClose} />
    </DrawerContent>
  )
}
