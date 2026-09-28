import { WizardModalDialog } from "@ui/components/WizardModalDialog"
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
    <WizardModalDialog title={title} className="h-auto w-160" onCloseClick={cancel}>
      {children}
    </WizardModalDialog>
  )
}
