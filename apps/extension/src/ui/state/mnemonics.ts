import { bind } from "@react-rxjs/core"
import { Mnemonic } from "extension-core"
import { map, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

import { debugObservable } from "./util/debugObservable"

export const mnemonics$ = new Observable<Mnemonic[]>((subscriber) => {
  const unsubscribe = api.mnemonicsSubscribe((mnemonics) => {
    subscriber.next(mnemonics)
  })
  return () => unsubscribe()
}).pipe(debugObservable("mnemonics$"), shareReplay(1))

export const [useMnemonics] = bind(mnemonics$)

export const [useMnemonic, getMnemonic$] = bind((id: string | null | undefined) =>
  mnemonics$.pipe(
    map((mnemonics) => {
      if (!id) return null
      return mnemonics.find((m) => m.id === id) ?? null
    }),
  ),
)
