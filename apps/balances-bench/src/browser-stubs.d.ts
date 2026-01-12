/**
 * Minimal browser API type stubs for typechecking.
 * This allows for balances-bench to typecheck without building @talismn/* packages
 *
 * balances-bench is a Node.js app, but it imports from @talismn/* packages
 * that have browser API references. These stubs allow typechecking to pass
 * without pulling in full DOM types (which conflict with Node.js types).
 *
 * At runtime, the necessary polyfills are applied (e.g., globalThis.crypto = webcrypto).
 */

// Stub for window global (used in chain-connectors for browser detection)
declare const window: Window & typeof globalThis

// Stub for indexedDB global (used in chaindata-provider and token-rates for Dexie)
declare const indexedDB: IDBFactory

// Minimal types needed for the stubs
interface Window {
  addEventListener: typeof globalThis.addEventListener
  removeEventListener: typeof globalThis.removeEventListener
}

interface IDBFactory {
  open(name: string, version?: number): IDBOpenDBRequest
  deleteDatabase(name: string): IDBOpenDBRequest
  databases(): Promise<IDBDatabaseInfo[]>
  cmp(first: unknown, second: unknown): number
}

interface IDBOpenDBRequest extends IDBRequest<IDBDatabase> {
  onupgradeneeded: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown) | null
  onblocked: ((this: IDBOpenDBRequest, ev: Event) => unknown) | null
}

interface IDBRequest<T = unknown> extends EventTarget {
  readonly error: DOMException | null
  readonly result: T
  readonly source: IDBObjectStore | IDBIndex | IDBCursor | null
  readonly readyState: IDBRequestReadyState
  readonly transaction: IDBTransaction | null
  onerror: ((this: IDBRequest<T>, ev: Event) => unknown) | null
  onsuccess: ((this: IDBRequest<T>, ev: Event) => unknown) | null
}

type IDBRequestReadyState = "pending" | "done"

interface IDBDatabase extends EventTarget {
  readonly name: string
  readonly version: number
  readonly objectStoreNames: DOMStringList
  close(): void
  createObjectStore(name: string, options?: IDBObjectStoreParameters): IDBObjectStore
  deleteObjectStore(name: string): void
  transaction(storeNames: string | string[], mode?: IDBTransactionMode): IDBTransaction
}

interface IDBDatabaseInfo {
  name?: string
  version?: number
}

interface IDBVersionChangeEvent extends Event {
  readonly newVersion: number | null
  readonly oldVersion: number
}

interface IDBObjectStoreParameters {
  autoIncrement?: boolean
  keyPath?: string | string[] | null
}

interface IDBObjectStore {
  readonly name: string
  readonly keyPath: string | string[]
  readonly indexNames: DOMStringList
  readonly transaction: IDBTransaction
  readonly autoIncrement: boolean
}

interface IDBIndex {
  readonly name: string
  readonly keyPath: string | string[]
  readonly multiEntry: boolean
  readonly unique: boolean
}

interface IDBCursor {
  readonly direction: IDBCursorDirection
  readonly key: IDBValidKey
  readonly primaryKey: IDBValidKey
  readonly source: IDBObjectStore | IDBIndex
}

interface IDBTransaction extends EventTarget {
  readonly db: IDBDatabase
  readonly mode: IDBTransactionMode
  readonly objectStoreNames: DOMStringList
  objectStore(name: string): IDBObjectStore
  abort(): void
  commit(): void
}

type IDBTransactionMode = "readonly" | "readwrite" | "versionchange"
type IDBCursorDirection = "next" | "nextunique" | "prev" | "prevunique"
type IDBValidKey = number | string | Date | BufferSource | IDBValidKey[]

interface DOMStringList {
  readonly length: number
  contains(string: string): boolean
  item(index: number): string | null
  [index: number]: string
}

interface DOMException extends Error {
  readonly code: number
  readonly name: string
}

// MessageEvent needs to be generic (Node.js has non-generic MessageEvent)
// Use 'any' for ports to avoid conflicts with Node.js MessagePort
declare class MessageEvent<T = unknown> extends Event {
  readonly data: T
  readonly lastEventId: string
  readonly origin: string
  // biome-ignore lint/suspicious/noExplicitAny: Avoid conflict with Node.js MessagePort
  readonly ports: readonly any[]
  readonly source: unknown
}
