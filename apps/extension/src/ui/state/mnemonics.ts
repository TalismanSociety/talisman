import { bind } from "@react-rxjs/core"
import { MnemonicSource, mnemonicsStore } from "extension-core"
import { map } from "rxjs"

export type Mnemonic = {
  id: string
  name: string
  confirmed: boolean
  source: MnemonicSource
}

export const [useMnemonics, mnemonics$] = bind(
  mnemonicsStore.observable.pipe(
    map((data) =>
      Object.values(data).map(
        ({ id, name, confirmed, source }) =>
          ({
            id,
            name,
            confirmed,
            source,
          } as Mnemonic)
      )
    )
  )
)

export const [useMnemonic, getMnemonic$] = bind((id: string | null | undefined) =>
  mnemonics$.pipe(
    map((mnemonics) => {
      if (!id) return null
      return mnemonics.find((m) => m.id === id) ?? null
    })
  )
)
