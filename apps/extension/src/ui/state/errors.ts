import type { ErrorsStoreData } from "@core/domains/app/store.errors"
import { errorsStore } from "@core/domains/app/store.errors"
import { bind } from "@react-rxjs/core"
import { map, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const errors$ = errorsStore.observable.pipe(debugObservable("errors$"), shareReplay(1))

const [useErrorsStoreValueInner] = bind((key: keyof ErrorsStoreData) =>
  errors$.pipe(map((state) => state[key]))
)

export const useErrorsStoreValue = <K extends keyof ErrorsStoreData>(key: K) =>
  useErrorsStoreValueInner(key) as ErrorsStoreData[K]
