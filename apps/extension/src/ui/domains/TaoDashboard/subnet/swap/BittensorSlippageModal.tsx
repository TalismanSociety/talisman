import { BittensorSlippageForm } from "@ui/domains/Staking/Bittensor/shared/BittensorSlippageForm"
import { useOpenCloseStatus } from "@ui/hooks/useOpenCloseStatus"
import { Modal } from "@ui/talisman-ui/components/Modal"
import { ModalDialog } from "@ui/talisman-ui/components/ModalDialog"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { useBittensorSlippageModal } from "./useBittensorSlippageModal"

export const BittensorSlippageModal: FC = () => {
  const { isOpen, close, args } = useBittensorSlippageModal()

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      {args && <Content netuid={args.netuid} onClose={close} />}
    </Modal>
  )
}

const Content: FC<{ netuid: number; onClose: () => void }> = ({ netuid, onClose }) => {
  const { t } = useTranslation()
  const status = useOpenCloseStatus()

  return (
    <ModalDialog title={t("Slippage Tolerance")} onClose={onClose}>
      <BittensorSlippageForm netuid={netuid} onClose={onClose} autoFocus={status === "open"} />
    </ModalDialog>
  )
}
