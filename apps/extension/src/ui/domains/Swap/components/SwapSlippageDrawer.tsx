import { Drawer } from "@ui/components/Drawer"
import { DrawerContent } from "@ui/components/DrawerContent"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { SwapSlippageForm } from "./SwapSlippageForm"

export const SwapSlippageDrawer: FC<{
  isOpen: boolean
  onClose: () => void
  containerId: string
}> = ({ containerId, isOpen, onClose }) => {
  const { t } = useTranslation()

  return (
    <Drawer anchor="bottom" isOpen={isOpen} onDismiss={onClose} containerId={containerId}>
      <DrawerContent className="flex flex-col items-center gap-4">
        <div className="pb-8 font-bold text-body">{t("Slippage Tolerance")}</div>
        <SwapSlippageForm onClose={onClose} />
      </DrawerContent>
    </Drawer>
  )
}
