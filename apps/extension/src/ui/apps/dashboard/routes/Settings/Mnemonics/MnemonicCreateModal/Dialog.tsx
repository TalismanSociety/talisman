import { ModalDialog } from "@ui/talisman-ui"
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
    <ModalDialog title={title} className="w-[64rem]" onClose={cancel}>
      {children}
    </ModalDialog>
  )
}
