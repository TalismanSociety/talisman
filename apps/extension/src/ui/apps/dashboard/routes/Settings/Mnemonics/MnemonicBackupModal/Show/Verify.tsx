import { useMnemonicUnlock } from "@ui/domains/Mnemonic/MnemonicUnlock"
import { Verify as VerifyBase } from "@ui/domains/Mnemonic/Verify"
import { flows } from "@ui/hooks/analytics/flows"

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
        flows.recovery_phrase_backup.completed({ verified: true })
        setStage(Stages.Complete)
      }}
      onSkip={() => {
        flows.recovery_phrase_backup.completed({ verified: false })
        close()
      }}
    />
  )
}
