import { ErrorEvent, EventHint } from "@sentry/types"
import { Dexie, DexieError } from "dexie"
import { ReplaySubject, firstValueFrom } from "rxjs"

import { StorageProvider } from "../../libs/Store"

export interface ErrorsStoreData {
  databaseUnavailable: boolean
  databaseQuotaExceeded: boolean
  StartupLog: number[]
  DexieAbortLog: number[]
  DexieDatabaseClosedLog: number[]
  DexieQuotaExceededLog: number[]
}

export class ErrorsStore extends StorageProvider<ErrorsStoreData> {}

export const ERRORS_STORE_INITIAL_DATA: ErrorsStoreData = {
  databaseUnavailable: false,
  databaseQuotaExceeded: false,
  StartupLog: [],
  DexieAbortLog: [],
  DexieDatabaseClosedLog: [],
  DexieQuotaExceededLog: [],
}

export const errorsStore = new ErrorsStore("errors", ERRORS_STORE_INITIAL_DATA)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// cache latest value of errorsStore so that we don't need to check localStorage for every error sent to sentry
const errorsStoreData = new ReplaySubject<ErrorsStoreData>(1)
errorsStore.observable.subscribe((data) => errorsStoreData.next(data))

export const trackIndexedDbErrorExtras = async (event: ErrorEvent, hint: EventHint) => {
  const rootError = hint.originalException
  const [errorType] = findDexieErrors(rootError)

  switch (errorType) {
    case "Abort":
      event.extra ||= {}
      event.extra.errorsStoreData = await firstValueFrom(errorsStoreData)
      return errorsStore.mutate((store) => {
        store.DexieAbortLog.push(Date.now())
        return store
      })
    case "DatabaseClosed":
      event.extra ||= {}
      event.extra.errorsStoreData = await firstValueFrom(errorsStoreData)
      return errorsStore.mutate((store) => {
        store.DexieDatabaseClosedLog.push(Date.now())
        return store
      })
    case "QuotaExceeded":
      event.extra ||= {}
      event.extra.errorsStoreData = await firstValueFrom(errorsStoreData)
      return errorsStore.mutate((store) => {
        store.DexieQuotaExceededLog.push(Date.now())
        return store
      })
  }
  return
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const findDexieErrors = (rootError: any) => {
  // recursively extract each child `error.cause` into this array
  const errorChain = []
  for (let error = rootError; error !== undefined; error = error?.cause) {
    errorChain.push(error)
  }

  // find the first dexie error in the chain
  const dexieError: DexieError = errorChain.find((error) => error instanceof Dexie.DexieError)

  // ignore this error unless it, or one of its causes is a DexieError
  if (!dexieError) return [] as const

  // return the dexieError and its type
  return [switchDexieErrorType(dexieError), dexieError] as const
}

export const switchDexieErrorType = (dexieError: DexieError) => {
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
