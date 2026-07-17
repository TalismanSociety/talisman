/**
 * A Map with a maximum size and least-recently-used eviction.
 *
 * Reads refresh recency; when an insert would exceed `maxSize`, the
 * least-recently-used entry is evicted. Intended for long-lived in-memory
 * caches that would otherwise grow without bound.
 */
export class LruMap<K, V> {
  #map = new Map<K, V>()
  #maxSize: number

  constructor(maxSize: number) {
    if (maxSize < 1) throw new Error("LruMap maxSize must be >= 1")
    this.#maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (!this.#map.has(key)) return undefined
    const value = this.#map.get(key) as V
    // refresh recency: Map preserves insertion order, oldest entry is first
    this.#map.delete(key)
    this.#map.set(key, value)
    return value
  }

  set(key: K, value: V): this {
    if (this.#map.has(key)) this.#map.delete(key)
    else if (this.#map.size >= this.#maxSize) {
      const oldest = this.#map.keys().next()
      if (!oldest.done) this.#map.delete(oldest.value)
    }
    this.#map.set(key, value)
    return this
  }

  has(key: K): boolean {
    return this.#map.has(key)
  }

  delete(key: K): boolean {
    return this.#map.delete(key)
  }

  clear(): void {
    this.#map.clear()
  }

  get size(): number {
    return this.#map.size
  }
}
