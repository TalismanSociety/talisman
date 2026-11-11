/**
 * A Map bounded to `maxSize` entries that evicts the least recently used one. Keys longer
 * than `maxKeyLength` are never stored, so oversized input can't hold memory either.
 */
export class LruCache<V> {
  readonly #entries = new Map<string, V>()

  constructor(
    readonly maxSize: number,
    readonly maxKeyLength: number
  ) {}

  get size() {
    return this.#entries.size
  }

  has(key: string) {
    return this.#entries.has(key)
  }

  get(key: string): V | undefined {
    if (!this.#entries.has(key)) return undefined
    const value = this.#entries.get(key) as V
    // re-insert to mark as most recently used (Map iterates in insertion order)
    this.#entries.delete(key)
    this.#entries.set(key, value)
    return value
  }

  set(key: string, value: V) {
    if (key.length > this.maxKeyLength) return
    this.#entries.delete(key)
    this.#entries.set(key, value)
    if (this.#entries.size > this.maxSize) {
      const oldest = this.#entries.keys().next()
      if (!oldest.done) this.#entries.delete(oldest.value)
    }
  }
}
