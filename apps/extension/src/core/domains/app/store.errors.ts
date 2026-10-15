import { Dexie, type DexieError } from "dexie"

import { StorageProvider } from "../../libs/Store"

export interface ErrorsStoreData {
  databaseUnavailable: boolean
  databaseQuotaExceeded: boolean
}

class ErrorsStore extends StorageProvider<ErrorsStoreData> {}

const ERRORS_STORE_INITIAL_DATA: ErrorsStoreData = {
  databaseUnavailable: false,
  databaseQuotaExceeded: false,
}

export const errorsStore = new ErrorsStore("errors", ERRORS_STORE_INITIAL_DATA)

// biome-ignore lint/suspicious/noExplicitAny: legacy
export const triggerIndexedDbUnavailablePopup = (rootError: any) => {
  const [errorType] = findDexieErrors(rootError)

  switch (errorType) {
    case "Abort":
      return errorsStore.mutate((store) => {
        store.databaseUnavailable = true
        return store
      })
    case "DatabaseClosed":
      return errorsStore.mutate((store) => {
        store.databaseUnavailable = true
        return store
      })
    case "QuotaExceeded":
      return errorsStore.mutate((store) => {
        store.databaseQuotaExceeded = true
        return store
      })
  }
  return
}

// biome-ignore lint/suspicious/noExplicitAny: legacy
const findDexieErrors = (rootError: any) => {
  // recursively extract each child `error.cause` into this array
  const errorChain = []
  for (let error = rootError; error !== undefined; error = error?.cause) {
    errorChain.push(error)
  }

  // find the first dexie error in the chain
  const dexieError = errorChain.find((error) => error instanceof Dexie.DexieError)

  // ignore this error unless it, or one of its causes is a DexieError
  if (!dexieError) return [] as const

  // return the dexieError and its type
  return [switchDexieErrorType(dexieError), dexieError] as const
}

const switchDexieErrorType = (dexieError: DexieError) => {
  // find Abort errors
  if (
    dexieError.name === Dexie.errnames.Abort &&
    // only follow this branch if the AbortError's `inner` error is not a QuotaExceeded error
    dexieError.inner?.name !== Dexie.errnames.QuotaExceeded
  )
    return "Abort"

  // find DatabaseClosed errors
  if (dexieError.name === Dexie.errnames.DatabaseClosed) return "DatabaseClosed"

  // find QuotaExceeded errors
  if (
    dexieError.name === Dexie.errnames.QuotaExceeded ||
    // can sometimes be raised as the `inner` error of an AbortError
    dexieError.inner?.name === Dexie.errnames.QuotaExceeded
  )
    return "QuotaExceeded"

  // some other type of dexie error
  return
}
