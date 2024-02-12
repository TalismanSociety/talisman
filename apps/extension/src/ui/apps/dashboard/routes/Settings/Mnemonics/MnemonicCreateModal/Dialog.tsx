import { ReactNode } from "react"
import { ModalDialog } from "talisman-ui"

import { useMnemonicCreateModal } from "./context"

export const MnemonicCreateModalDialog = ({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) => {
  const { cancel } = useMnemonicCreateModal()

  return (
    <ModalDialog className="!min-w-[64rem]" title={title} onClose={cancel}>
      {children}
    </ModalDialog>
  )
}
