import { bind } from "@react-rxjs/core"
import { map, shareReplay } from "rxjs"

import { errorsStore, ErrorsStoreData } from "@extension/core"

import { debugObservable } from "./util/debugObservable"

const errors$ = errorsStore.observable.pipe(debugObservable("errors$"), shareReplay(1))

const [useErrorsStoreValueInner] = bind((key: keyof ErrorsStoreData) =>
  errors$.pipe(map((state) => state[key])),
)

export const useErrorsStoreValue = <K extends keyof ErrorsStoreData>(key: K) =>
  useErrorsStoreValueInner(key) as ErrorsStoreData[K]
