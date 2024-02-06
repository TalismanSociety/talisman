import { mnemonicGenerate } from "@polkadot/util-crypto"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useMemo, useState } from "react"

type BackupCreateResult = { mnemonic: string; confirmed: boolean } | null
type BackupCreateResultCallback = { resolve: (result: BackupCreateResult) => void }

export enum Stages {
  Acknowledgement = "Acknowledgement",
  Create = "Create",
  Verify = "Verify",
  Complete = "Complete",
}

const useMnemonicCreateProvider = () => {
  // keep data in state here to reuse same values if user closes and reopens modal
  const [wordsCount, setWordsCount] = useState<12 | 24>(12)
  const [confirmed, setConfirmed] = useState(false)
  const [mnemonic12] = useState<string>(mnemonicGenerate(12))
  const [mnemonic24] = useState<string>(mnemonicGenerate(24))
  const [stage, setStage] = useState(Stages.Acknowledgement)

  const mnemonic = useMemo(() => {
    switch (wordsCount) {
      case 12:
        return mnemonic12
      case 24:
        return mnemonic24
    }
  }, [mnemonic12, mnemonic24, wordsCount])

  const [callback, setCallback] = useState<BackupCreateResultCallback>()

  const complete = useCallback(() => {
    if (!callback) return
    callback.resolve({ mnemonic, confirmed })
    setCallback(undefined)
  }, [mnemonic, callback, confirmed])

  const cancel = useCallback(() => {
    if (!callback) return
    callback.resolve(null)
    setCallback(undefined)
  }, [callback])

  const generateMnemonic = useCallback(() => {
    return new Promise<BackupCreateResult>((resolve) => {
      setCallback({ resolve })
    })
  }, [])

  return {
    mnemonic,
    isOpen: !!callback,
    cancel,
    complete,
    wordsCount,
    setWordsCount,
    generateMnemonic,
    setConfirmed,
    stage,
    setStage,
  }
}

export const [MnemonicCreateModalProvider, useMnemonicCreateModal] =
  provideContext(useMnemonicCreateProvider)
