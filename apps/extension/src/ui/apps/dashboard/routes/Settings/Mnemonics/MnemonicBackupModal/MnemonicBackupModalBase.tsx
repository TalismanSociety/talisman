import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { cn } from "@ui/util/cn"

import { useMnemonicBackupModal } from "./context"

export const MnemonicBackupModalBase = ({
  children,
  title,
  className = "",
}: {
  children: React.ReactNode
  title?: string
  className?: string
}) => {
  const { close } = useMnemonicBackupModal()
  return (
    <WizardModalDialog
      className={cn("h-auto w-auto p-2", className)}
      title={title && <span className="font-semibold text-md">{title}</span>}
      onCloseClick={close}
    >
      {children}
    </WizardModalDialog>
  )
}
