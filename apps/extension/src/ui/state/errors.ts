import { bind } from "@react-rxjs/core"
import { map } from "rxjs"

import { errorsStore, ErrorsStoreData } from "@extension/core"

const [useErrorsStoreValueInner] = bind((key: keyof ErrorsStoreData) =>
  errorsStore.observable.pipe(map((state) => state[key]))
)

export const useErrorsStoreValue = <K extends keyof ErrorsStoreData>(key: K) =>
  useErrorsStoreValueInner(key) as ErrorsStoreData[K]
