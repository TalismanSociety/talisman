// import { BalanceJson, compress, configureStore, decompress } from "@talismn/balances"

// type PersistFn = (balances: BalanceJson[]) => Promise<void>
// type RetrieveFn = () => Promise<BalanceJson[]>

// export type BalancesPersistBackend = {
//   persist: PersistFn
//   retrieve: RetrieveFn
// }

// /**
// // Persistence backend for indexedDB
// // Add a new backend by implementing the BalancesPersistBackend interface
// // configureStore can be called with a different indexedDB table
// */
// const { persistData, retrieveData } = configureStore()
// export const indexedDbBalancesPersistBackend: BalancesPersistBackend = {
//   persist: persistData,
//   retrieve: () =>
//     retrieveData().then((balances) =>
//       balances.map((b) => ({ ...b, status: "cache" }) as BalanceJson),
//     ),
// }

// /**
// // Persistence backend for localStorage
// */
// const localStoragePersist: PersistFn = async (balances) => {
//   const storedBalances = balances.map((b) => {
//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     const { status, ...rest } = b
//     return rest
//   })
//   const deflated = compress(storedBalances)
//   localStorage.setItem("talismanBalances", deflated.toString())
// }

// const localStorageRetrieve: RetrieveFn = async () => {
//   const deflated = localStorage.getItem("talismanBalances")
//   if (deflated) {
//     // deflated will be a long string of numbers separated by commas
//     const deflatedArray = deflated.split(",").map((n) => parseInt(n, 10))
//     const deflatedBytes = new Uint8Array(deflatedArray.length)
//     deflatedArray.forEach((n, i) => (deflatedBytes[i] = n))
//     return decompress(deflatedBytes).map((b) => ({ ...b, status: "cache" }) as BalanceJson)
//   }
//   return []
// }

// export const localStorageBalancesPersistBackend: BalancesPersistBackend = {
//   persist: localStoragePersist,
//   retrieve: localStorageRetrieve,
// }

// import { Table } from "dexie"
// import pako from "pako"

// export type StoredBalanceJson = Omit<BalanceJson, "status">

// export const configureStore = (dbTable: Table = db.balancesBlob) => ({
//   persistData: async (balances: StoredBalanceJson[]) => {
//     const output = compress(balances)
//     await dbTable.clear()
//     await dbTable.put({ data: output, id: Date.now().toString() })
//   },
//   retrieveData: async (): Promise<StoredBalanceJson[]> => {
//     const compressedData = await dbTable.toCollection().first()
//     if (!compressedData) return []
//     return decompress(compressedData.data)
//   },
// })

// export const compress = (balances: StoredBalanceJson[]) => pako.deflate(JSON.stringify(balances))
// export const decompress = (data: Uint8Array | ArrayBuffer): StoredBalanceJson[] => {
//   const decompressed = pako.inflate(data, { to: "string" })
//   return JSON.parse(decompressed)
// }
