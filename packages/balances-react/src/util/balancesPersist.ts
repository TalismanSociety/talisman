import { StoredBalanceJson, persistData, retrieveData } from "@talismn/balances"

export type BalancesPersistBackend = {
  persist: (balances: StoredBalanceJson[]) => Promise<void>
  retrieve: () => Promise<StoredBalanceJson[]>
}

/** 
// Persistence backend for indexedDB, used by default
// Add a new backend by implementing the BalancesPersistBackend interface
*/
export const indexedDbBalancesPersistBackend: BalancesPersistBackend = {
  persist: persistData,
  retrieve: retrieveData,
}
