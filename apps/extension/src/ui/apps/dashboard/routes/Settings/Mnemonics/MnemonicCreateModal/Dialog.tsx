import { ModalDialog } from "@ui/components/ModalDialog"
import type { ReactNode } from "react"

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
    <ModalDialog title={title} className="h-auto w-160" onCloseClick={cancel}>
      {children}
    </ModalDialog>
  )
}
