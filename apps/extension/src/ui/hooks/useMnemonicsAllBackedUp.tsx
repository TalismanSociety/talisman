import { useMnemonics } from "@ui/state/mnemonics"
import { useMemo } from "react"

export const useMnemonicsAllBackedUp = () => {
  const mnemonics = useMnemonics()
  const hasMnemonics = useMemo(() => mnemonics.length > 0, [mnemonics])

  const allBackedUp = useMemo(
    () => !hasMnemonics || mnemonics.every((mnemonic) => mnemonic.confirmed),
    [mnemonics, hasMnemonics]
  )

  return allBackedUp
}
