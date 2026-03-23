import { ModalDialog } from "@ui/components/ModalDialog"
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
    <ModalDialog
      className={cn("w-auto p-2", className)}
      title={title && <span className="font-semibold text-md">{title}</span>}
      onClose={close}
    >
      {children}
    </ModalDialog>
  )
}
