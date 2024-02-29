import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { useMnemonic, useMnemonics } from "@ui/hooks/useMnemonics"
import { useCallback, useState } from "react"

export enum Stages {
  Acknowledgement = "Acknowledgement",
  Show = "Show",
  Verify = "Verify",
  Complete = "Complete",
}

const useMnemonicBackupModalProvider = () => {
  const mnemonics = useMnemonics()
  const [mnemonicId, setMnemonicId] = useState<string | undefined>()
  const mnemonic = useMnemonic(mnemonicId)

  const [stage, setStage] = useState(Stages.Acknowledgement)

  const { isOpen, open: innerOpen, close } = useOpenClose()

  const open = useCallback(
    (mnemonicId?: string) => {
      setMnemonicId(mnemonicId)
      setStage(Stages.Acknowledgement)
      innerOpen()
    },
    [innerOpen, setStage]
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
