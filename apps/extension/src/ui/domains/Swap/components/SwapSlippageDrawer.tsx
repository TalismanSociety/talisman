import { Drawer } from "@ui/components/Drawer"
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
      <div className="flex w-full flex-col items-center gap-4 rounded-t-xl bg-black-secondary p-12">
        <div className="pb-8 font-bold text-body">{t("Slippage Tolerance")}</div>
        <SwapSlippageForm onClose={onClose} />
      </div>
    </Drawer>
  )
}
