interface SessionStorageData {
  password?: string
}

type MapSessionStorageData = Map<
  keyof SessionStorageData,
  SessionStorageData[keyof SessionStorageData]
>

abstract class TalismanSessionStorage {
  abstract get<K extends keyof SessionStorageData>(
    key: K
  ): Promise<SessionStorageData[K] | undefined>
  abstract set(data: Partial<SessionStorageData>): Promise<void>
  abstract clear(): Promise<void>
}

class MemoryStorage implements TalismanSessionStorage {
  #data: MapSessionStorageData

  constructor(initialData: SessionStorageData = {}) {
    this.#data = new Map(Object.entries(initialData)) as MapSessionStorageData
  }

  set(items: Partial<SessionStorageData>) {
    return new Promise<void>((resolve) => {
      ;(Object.keys(items) as Array<keyof SessionStorageData>).forEach((key) => {
        this.#data.set(key, items[key])
      })
      resolve()
    })
  }

  get<K extends keyof SessionStorageData>(key: K) {
    const result = this.#data.get(key)
    return new Promise<SessionStorageData[K]>((resolve) => resolve(result))
  }

  clear(): Promise<void> {
    this.#data.clear()
    return new Promise((resolve) => resolve())
  }
}

class SessionStorage implements TalismanSessionStorage {
  set(data: Partial<SessionStorageData>) {
    return chrome.storage.session.set(data)
  }

  async get<K extends keyof SessionStorageData>(key: K) {
    return (await chrome.storage.session.get(key))[key]
  }

  clear() {
    return chrome.storage.session.clear()
  }
}

let sessionStorage: TalismanSessionStorage
if (chrome.storage.session) {
  sessionStorage = new SessionStorage()
} else {
  sessionStorage = new MemoryStorage()
}

export { sessionStorage }
