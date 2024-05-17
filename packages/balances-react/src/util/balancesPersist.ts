import { StoredBalanceJson, configureStore } from "@talismn/balances"
import Pako from "pako"

type PersistFn = (balances: StoredBalanceJson[]) => Promise<void>
type RetrieveFn = () => Promise<StoredBalanceJson[]>

export type BalancesPersistBackend = {
  persist: PersistFn
  retrieve: RetrieveFn
}

/** 
// Persistence backend for indexedDB, used by default
// Add a new backend by implementing the BalancesPersistBackend interface
// configureStore can be called with a different indexedDB table
*/
const { persistData, retrieveData } = configureStore()
export const indexedDbBalancesPersistBackend: BalancesPersistBackend = {
  persist: persistData,
  retrieve: retrieveData,
}

const localStoragePersist: PersistFn = async (balances) => {
  const json = JSON.stringify(balances)
  const deflated = Pako.deflate(json)
  localStorage.setItem("talismanBalances", deflated.toString())
}

const localStorageRetrieve: RetrieveFn = async () => {
  const deflated = localStorage.getItem("talismanBalances")
  if (deflated) {
    // deflated will be a long string of numbers separated by commas
    const deflatedArray = deflated.split(",").map((n) => parseInt(n, 10))
    const deflatedBytes = new Uint8Array(deflatedArray.length)
    deflatedArray.forEach((n, i) => (deflatedBytes[i] = n))

    const json = Pako.inflate(deflatedBytes, { to: "string" })
    return JSON.parse(json)
  }
  return []
}

/** 
// Persistence backend for localStorage
*/
export const localStorageBalancesPersistBackend: BalancesPersistBackend = {
  persist: localStoragePersist,
  retrieve: localStorageRetrieve,
}
