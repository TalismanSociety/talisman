import { StorageProvider } from "@core/libs/Store"

export interface ErrorsStoreData {
  databaseUnavailable: boolean
  databaseQuotaExceeded: boolean
  DexieAbortLog: number[]
  DexieDatabaseClosedLog: number[]
  DexieQuotaExceededLog: number[]
}

export class ErrorsStore extends StorageProvider<ErrorsStoreData> {}

export const ERRORS_STORE_INITIAL_DATA: ErrorsStoreData = {
  databaseUnavailable: false,
  databaseQuotaExceeded: false,
  DexieAbortLog: [],
  DexieDatabaseClosedLog: [],
  DexieQuotaExceededLog: [],
}

export const errorsStore = new ErrorsStore("errors", ERRORS_STORE_INITIAL_DATA)
