import { useMnemonicUnlock } from "@ui/domains/Mnemonic/MnemonicUnlock"
import { Verify as VerifyBase } from "@ui/domains/Mnemonic/Verify"

import { Stages, useMnemonicBackupModal } from "../context"

export const Verify = () => {
  const { setStage, close } = useMnemonicBackupModal()
  const { mnemonic } = useMnemonicUnlock()

  if (!mnemonic) return null
  return (
    <VerifyBase
      mnemonic={mnemonic}
      onBack={() => {
        setStage(Stages.Show)
      }}
      onComplete={() => {
        setStage(Stages.Complete)
      }}
      onSkip={close}
    />
  )
}
