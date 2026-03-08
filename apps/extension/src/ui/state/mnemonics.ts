import type { Mnemonic } from "@core/domains/keyring/exports"
import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { map, Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const mnemonics$ = new Observable<Mnemonic[]>((subscriber) => {
  const unsubscribe = api.mnemonicsSubscribe((mnemonics) => {
    subscriber.next(mnemonics)
  })
  return () => unsubscribe()
}).pipe(debugObservable("mnemonics$"), shareReplay(1))

export const [useMnemonics] = bind(mnemonics$)

const [useMnemonic, _getMnemonic$] = bind((id: string | null | undefined) =>
  mnemonics$.pipe(
    map((mnemonics) => {
      if (!id) return null
      return mnemonics.find((m) => m.id === id) ?? null
    })
  )
)

export { useMnemonic }
