import { StoredBalanceJson, compress, configureStore, decompress } from "@talismn/balances"

type PersistFn = (balances: StoredBalanceJson[]) => Promise<void>
type RetrieveFn = () => Promise<StoredBalanceJson[]>

export type BalancesPersistBackend = {
  persist: PersistFn
  retrieve: RetrieveFn
}

/** 
// Persistence backend for indexedDB
// Add a new backend by implementing the BalancesPersistBackend interface
// configureStore can be called with a different indexedDB table
*/
const { persistData, retrieveData } = configureStore()
export const indexedDbBalancesPersistBackend: BalancesPersistBackend = {
  persist: persistData,
  retrieve: retrieveData,
}

/** 
// Persistence backend for localStorage
*/
const localStoragePersist: PersistFn = async (balances) => {
  const deflated = compress(balances)
  localStorage.setItem("talismanBalances", deflated.toString())
}

const localStorageRetrieve: RetrieveFn = async () => {
  const deflated = localStorage.getItem("talismanBalances")
  if (deflated) {
    // deflated will be a long string of numbers separated by commas
    const deflatedArray = deflated.split(",").map((n) => parseInt(n, 10))
    const deflatedBytes = new Uint8Array(deflatedArray.length)
    deflatedArray.forEach((n, i) => (deflatedBytes[i] = n))
    return decompress(deflatedBytes)
  }
  return []
}

export const localStorageBalancesPersistBackend: BalancesPersistBackend = {
  persist: localStoragePersist,
  retrieve: localStorageRetrieve,
}
