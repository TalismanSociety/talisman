import { Drawer } from "@ui/talisman-ui"
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
    <Drawer anchor="bottom" isOpen={isOpen} onDismiss={onClose} containerId={containerId}>
      <Content netuid={netuid} onClose={onClose} />
    </Drawer>
  )
}

export const Content: FC<{ netuid: number | null; onClose: () => void }> = ({
  netuid,
  onClose,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-t-xl bg-black-secondary p-12">
      <div className="pb-8 font-bold text-body">{t("Slippage Tolerance")}</div>
      <BittensorSlippageForm netuid={netuid} onClose={onClose} inputContainerClassName="bg-black" />
    </div>
  )
}
