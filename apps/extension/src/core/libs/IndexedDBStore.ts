import { assert } from "@polkadot/util"
import { TalismanSchema, waitDbReady } from "./db"

type OutputData<T extends { [key: string]: any }> = Record<T[keyof T], T>

const reduceData = <T, K extends keyof T>(data: Array<T>, idKey: K) =>
  data.reduce((result, item) => {
    result[item[idKey]] = item
    return result
  }, {} as OutputData<T>)

type SchemaValue<S extends keyof TalismanSchema> = TalismanSchema[S]["value"]
/**
 * IndexedDBStorageProvider provides storage usinng IndexedDB
 * In order to implement an IndexedDB store, instantiate an extended IndexedDBStorageProvider as follows:
 * @type S  The name of the store
 * @type T  The shape of each row of the data to be stored
 * @param prefix  string with unique name for the data store
 * @param idKey  string representing the key of the object of type T which will be used as the 'primary key' id of the row
 * @param initialData  optional array of database rows to instantiate the store with as default data
 * @param migrations  an optional object with version numbers as keys and functions of type MigrationFunction as values to run when the store is upgraded to the latest version
 *
 * To create a new IndexedDBStorageProvider store, you'll also need to add the stores definition in `TalismanSchema` above.
 */
export class IndexedDBStorageProvider<
  S extends keyof TalismanSchema
  // T extends TalismanSchema[S]["value"]
> {
  #prefix: S
  #idKey: keyof SchemaValue<S>

  constructor(prefix: S, idKey: keyof SchemaValue<S>) {
    this.#prefix = prefix
    this.#idKey = idKey
  }

  // get a stored value based on key
  async get(): Promise<OutputData<SchemaValue<S>>>
  async get(key: TalismanSchema[S]["key"]): Promise<SchemaValue<S>>
  async get(key?: TalismanSchema[S]["key"]): Promise<OutputData<SchemaValue<S>> | SchemaValue<S>> {
    const db = await waitDbReady()
    assert(db, "Database not initialised yet")
    if (key) return db.get(this.#prefix, key)
    return db.getAll(this.#prefix).then((data) => reduceData(data, this.#idKey))
  }

  // set a key:value pair
  async set(value: OutputData<SchemaValue<S>>): Promise<OutputData<SchemaValue<S>>> {
    const db = await waitDbReady()
    const tx = db!.transaction(this.#prefix, "readwrite")
    const current = await tx.store.getAll()
    const newData = {
      ...current,
      ...value,
    }
    // Don't await this one, it can happen asynchronously
    await Promise.all([...Object.values(newData).map((item) => tx.store.put(item)), tx.done])

    return newData
  }

  async setItem(item: SchemaValue<S>): Promise<void> {
    const db = await waitDbReady()
    const tx = db!.transaction(this.#prefix, "readwrite")

    await tx.store.put(item)
    return tx.done
  }
}
