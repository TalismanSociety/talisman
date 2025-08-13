import { KeypairCurve } from "@talismn/crypto"
import { useCallback, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"

export type AccountAddDerivationMode = "first" | "custom" | "multi"

type AccountAddMnemonicInputs = {
  name: string
  curve: KeypairCurve
  mode: AccountAddDerivationMode
  mnemonic: string
  derivationPath: string
  accountIndexes: number[]
}

const useAccountAddMnemonicProvider = ({ onSuccess }: { onSuccess: (address: string) => void }) => {
  const [data, setData] = useState<Partial<AccountAddMnemonicInputs>>(() => ({
    mode: "first",
  }))

  const updateData = useCallback((newData: Partial<AccountAddMnemonicInputs>) => {
    setData((prev) => ({
      ...prev,
      ...newData,
    }))
  }, [])

  return { data, updateData, onSuccess }
}

export const [AccountAddMnemonicProvider, useAccountAddMnemonic] = provideContext(
  useAccountAddMnemonicProvider,
)
