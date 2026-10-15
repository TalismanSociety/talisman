import { type FlowEntry, type FlowStep, flows, useFlow } from "@ui/hooks/analytics/flows"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useMnemonic, useMnemonics } from "@ui/state/mnemonics"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useState } from "react"

export enum Stages {
  Acknowledgement = "Acknowledgement",
  Show = "Show",
  Verify = "Verify",
  Complete = "Complete",
}

const BACKUP_STEPS = {
  [Stages.Acknowledgement]: "acknowledgement",
  [Stages.Show]: "show",
  [Stages.Verify]: "verify",
  [Stages.Complete]: null,
} as const satisfies Record<Stages, FlowStep<typeof flows.recovery_phrase_backup> | null>

type BackupEntry = FlowEntry<typeof flows.recovery_phrase_backup>

const useMnemonicBackupModalProvider = () => {
  const mnemonics = useMnemonics()
  const [mnemonicId, setMnemonicId] = useState<string | undefined>()
  const mnemonic = useMnemonic(mnemonicId)

  const [stage, setStage] = useState(Stages.Acknowledgement)
  const [entry, setEntry] = useState<BackupEntry>("settings")

  const { isOpen, open: innerOpen, close } = useOpenClose()
  useFlow(flows.recovery_phrase_backup, { active: isOpen, step: BACKUP_STEPS[stage], entry })

  const open = useCallback(
    (mnemonicId?: string, from: BackupEntry = "settings") => {
      setMnemonicId(mnemonicId)
      setStage(Stages.Acknowledgement)
      setEntry(from)
      innerOpen()
    },
    [innerOpen]
  )

  const isBackupConfirmed = useCallback(
    (mnemonicId: string) => {
      const mnemonic = mnemonics.find((m) => m.id === mnemonicId)
      return !!mnemonic?.confirmed
    },
    [mnemonics]
  )

  return {
    mnemonic,
    isOpen,
    open,
    close,
    isBackupConfirmed,
    stage,
    setStage,
  }
}

export const [MnemonicBackupModalProviderWrapper, useMnemonicBackupModal] = provideContext(
  useMnemonicBackupModalProvider
)
