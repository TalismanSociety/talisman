import { useMnemonicUnlock } from "@ui/domains/Mnemonic/MnemonicUnlock"
import { Verify as VerifyBase } from "@ui/domains/Mnemonic/Verify"

import { Stages, useMnemonicBackupModal } from "../context"

export const Verify = () => {
  const { setStage } = useMnemonicBackupModal()
  const { mnemonic } = useMnemonicUnlock()

  if (!mnemonic) return null
  return (
    <VerifyBase
      mnemonic={mnemonic}
      handleBack={() => {
        setStage(Stages.Show)
      }}
      handleComplete={() => {
        setStage(Stages.Complete)
      }}
    />
  )
}
