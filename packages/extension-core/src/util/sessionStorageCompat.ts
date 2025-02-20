interface SessionStorageData {
  password?: string
}

abstract class TalismanSessionStorage {
  abstract get<K extends keyof SessionStorageData>(
    key: K,
  ): Promise<SessionStorageData[K] | undefined>
  abstract remove<K extends keyof SessionStorageData>(keys: K | K[]): Promise<void>
  abstract set(data: Partial<SessionStorageData>): Promise<void>
  abstract clear(): Promise<void>
}

class MemoryStorage implements TalismanSessionStorage {
  #data: SessionStorageData = {}

  constructor(initialData: SessionStorageData = {}) {
    this.#data = { ...initialData }
  }

  set(items: Partial<SessionStorageData>) {
    return new Promise<void>((resolve) => {
      this.#data = { ...this.#data, ...items }
      resolve()
    })
  }

  remove(keys: string | string[]) {
    return new Promise<void>((resolve) => {
      keys = Array.isArray(keys) ? keys : [keys]

      this.#data = { ...this.#data }
      keys.forEach((key) => {
        delete (this.#data as Record<string, unknown>)[key]
      })

      resolve()
    })
  }

  get<K extends keyof SessionStorageData>(key: K) {
    const result = this.#data[key]
    return new Promise<SessionStorageData[K] | undefined>((resolve) => resolve(result))
  }

  clear(): Promise<void> {
    this.#data = {}
    return new Promise((resolve) => resolve())
  }
}

class SessionStorage implements TalismanSessionStorage {
  set(data: Partial<SessionStorageData>) {
    return chrome.storage.session.set(data)
  }

  remove(keys: string | number | (string | number)[]) {
    return chrome.storage.session.remove(keys)
  }

  async get<K extends keyof SessionStorageData>(key: K) {
    return (await chrome.storage.session.get(key))[key]
  }

  clear() {
    return chrome.storage.session.clear()
  }
}

let sessionStorage: TalismanSessionStorage
if (chrome && chrome.storage.session) {
  sessionStorage = new SessionStorage()
} else {
  sessionStorage = new MemoryStorage()
}

export { sessionStorage }
