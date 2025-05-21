import { useMemo } from "react"

import { useMnemonics } from "@ui/state"

export const useMnemonicBackup = () => {
  const mnemonics = useMnemonics()
  const hasMnemonics = useMemo(() => mnemonics.length > 0, [mnemonics])

  const allBackedUp = useMemo(
    () => !hasMnemonics || mnemonics.every((mnemonic) => mnemonic.confirmed),
    [mnemonics, hasMnemonics],
  )

  return {
    allBackedUp,
  }
}
