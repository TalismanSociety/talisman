import { VerificationComplete } from "@ui/domains/Mnemonic/VerificationComplete"

import { useMnemonicBackupModal } from "./context"
import { MnemonicBackupModalBase } from "./MnemonicBackupModalBase"

export const Complete = () => {
  const { close } = useMnemonicBackupModal()

  return (
    <MnemonicBackupModalBase>
      <div className="w-140!">
        <VerificationComplete onComplete={close} />
      </div>
    </MnemonicBackupModalBase>
  )
}
