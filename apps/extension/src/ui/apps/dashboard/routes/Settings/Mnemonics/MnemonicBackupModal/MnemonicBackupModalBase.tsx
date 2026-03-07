import { classNames } from "@talismn/util"
import { ModalDialog } from "@ui/talisman-ui/components/ModalDialog"

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
      className={classNames("w-auto p-2", className)}
      title={title && <span className="font-semibold text-md">{title}</span>}
      onClose={close}
    >
      {children}
    </ModalDialog>
  )
}
